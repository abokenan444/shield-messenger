# Android Architecture: Single-Activity Migration Guide

## Current State

Shield Messenger's Android app currently uses **54 separate Activities**, each with its own layout, lifecycle management, and navigation logic. While functional, this architecture creates several challenges:

| Issue | Impact |
|-------|--------|
| Memory overhead | Each Activity maintains its own window, view hierarchy, and saved state |
| Navigation complexity | Intent-based navigation with manual back stack management |
| State sharing | Requires SharedPreferences or Application-level singletons for cross-screen state |
| Animation limitations | Activity transitions are system-controlled with limited customization |
| Testing difficulty | Each Activity requires separate instrumentation test setup |
| Code duplication | BaseActivity pattern duplicated across 54 files (auto-lock, bottom nav, etc.) |

### Activity Inventory

The 54 Activities are grouped into the following functional domains:

| Domain | Activities | Count |
|--------|-----------|-------|
| **Authentication** | SplashActivity, WelcomeActivity, CreateAccountActivity, RestoreAccountActivity, LockActivity, DevicePasswordActivity | 6 |
| **Messaging** | MainActivity, ChatActivity, GroupChatActivity, ComposeActivity, AddFriendActivity | 5 |
| **Voice/Video** | VoiceCallActivity, IncomingCallActivity, CallLogActivity, NewCallActivity, CallHistoryActivity, ContactCallActivity | 6 |
| **Contacts** | ContactOptionsActivity, GroupMembersActivity, GroupProfileActivity, CreateGroupActivity | 4 |
| **Wallet** | WalletActivity, CreateWalletActivity, ImportWalletActivity, SendMoneyActivity, ReceiveActivity, AcceptPaymentActivity, RequestMoneyActivity, RequestDetailsActivity, TransactionsActivity, TransactionDetailActivity, TransferDetailsActivity, RecentTransactionsActivity, SwapActivity, WalletIdentityActivity, WalletSettingsActivity, SendActivity | 16 |
| **Settings** | SettingsActivity, SecurityModeActivity, AutoLockActivity, DuressPinActivity, NotificationsActivity, AboutActivity, BridgeActivity, CommunicationModeActivity, TorHealthActivity, DeveloperActivity, SystemLogActivity | 11 |
| **Security** | BackupSeedPhraseActivity, WipeAccountActivity, AccountCreatedActivity, QRScannerActivity | 4 |
| **Testing** | StressTestActivity | 1 |
| **Base** | BaseActivity (abstract) | 1 |

## Target Architecture

Migrate to a **Single-Activity Architecture** using Jetpack Navigation Component with Compose or Fragment-based UI:

```
ShieldMessengerActivity (single host)
├── NavHostFragment / NavHost (Compose)
│   ├── AuthGraph
│   │   ├── SplashScreen
│   │   ├── WelcomeScreen
│   │   ├── CreateAccountScreen
│   │   └── RestoreAccountScreen
│   ├── MainGraph
│   │   ├── MessagesScreen (with BottomNav)
│   │   ├── ChatScreen
│   │   ├── GroupChatScreen
│   │   └── ComposeScreen
│   ├── CallGraph
│   │   ├── VoiceCallScreen
│   │   ├── IncomingCallScreen (overlay)
│   │   └── CallHistoryScreen
│   ├── WalletGraph
│   │   ├── WalletScreen
│   │   ├── SendScreen
│   │   ├── ReceiveScreen
│   │   └── TransactionsScreen
│   ├── SettingsGraph
│   │   ├── SettingsScreen
│   │   ├── SecurityScreen
│   │   ├── DuressPinScreen
│   │   └── TorHealthScreen
│   └── SecurityGraph
│       ├── LockScreen
│       └── WipeScreen
```

## Migration Plan

### Phase 1: Foundation (Non-Breaking)

1. **Add Navigation dependencies** to `build.gradle.kts`:
   ```kotlin
   implementation("androidx.navigation:navigation-compose:2.7.7")
   // or for Fragment-based:
   implementation("androidx.navigation:navigation-fragment-ktx:2.7.7")
   implementation("androidx.navigation:navigation-ui-ktx:2.7.7")
   ```

2. **Create shared ViewModels** for cross-screen state:
   ```kotlin
   // Shared ViewModel scoped to navigation graph
   class AuthViewModel : ViewModel() { ... }
   class ChatViewModel : ViewModel() { ... }
   class WalletViewModel : ViewModel() { ... }
   ```

3. **Extract screen content** from each Activity into composable functions or Fragments:
   ```kotlin
   // Before: ChatActivity.kt (Activity with layout)
   // After: ChatScreen.kt (Composable or Fragment)
   @Composable
   fun ChatScreen(
       contactId: String,
       navController: NavController,
       viewModel: ChatViewModel = hiltViewModel()
   ) { ... }
   ```

### Phase 2: Navigation Graph

4. **Define navigation graphs** in `nav_graph.xml` or Compose Navigation:
   ```kotlin
   NavHost(navController, startDestination = "splash") {
       composable("splash") { SplashScreen(navController) }
       composable("welcome") { WelcomeScreen(navController) }
       composable("chat/{contactId}") { backStackEntry ->
           ChatScreen(
               contactId = backStackEntry.arguments?.getString("contactId") ?: "",
               navController = navController
           )
       }
       // ... etc
   }
   ```

5. **Migrate BottomNavigation** to a single instance in the host Activity:
   ```kotlin
   // BottomNav only visible on main screens
   Scaffold(
       bottomBar = {
           if (currentRoute in mainScreenRoutes) {
               ShieldBottomNav(navController)
           }
       }
   ) { ... }
   ```

### Phase 3: Activity Consolidation

6. **Migrate Activities one domain at a time**, starting with the simplest:
   - Settings screens (stateless, simple navigation)
   - Wallet screens (self-contained graph)
   - Auth screens (linear flow)
   - Messaging screens (complex, migrate last)

7. **Handle special cases**:
   - `IncomingCallActivity`: Needs `showWhenLocked` and `turnScreenOn` — use Window flags on the host Activity when navigating to this screen
   - `QRScannerActivity`: Camera permission and preview — use CameraX composable
   - `LockActivity`: Must intercept all navigation — use NavGraph interceptor

### Phase 4: Cleanup

8. **Remove migrated Activities** from `AndroidManifest.xml`
9. **Delete old Activity files** and layouts
10. **Update deep links** and notification intents to use Navigation deep links

## Shared State Architecture

```kotlin
// Application-level state (survives configuration changes)
@HiltViewModel
class AppStateViewModel @Inject constructor(
    private val torManager: TorManager,
    private val cryptoStore: CryptoStore,
) : ViewModel() {
    val torStatus: StateFlow<TorStatus>
    val isLocked: StateFlow<Boolean>
    val unreadCount: StateFlow<Int>
}

// Screen-level state (scoped to navigation graph)
@HiltViewModel
class ChatViewModel @Inject constructor(
    private val messageRepository: MessageRepository,
    private val rustBridge: RustBridge,
) : ViewModel() {
    fun sendMessage(contactId: String, text: String) { ... }
    fun loadMessages(contactId: String): Flow<List<Message>> { ... }
}
```

## Security Considerations

1. **FLAG_SECURE**: Apply to the single host Activity window (covers all screens)
2. **Auto-lock**: Single timer in the host Activity, no need to coordinate across Activities
3. **Duress PIN**: Check in the NavGraph interceptor before allowing navigation
4. **Back stack clearing**: Use `popUpTo(0)` when navigating to lock screen
5. **Memory wiping**: Override `onDestroy()` in the host Activity to zeroize sensitive state

## Benefits After Migration

| Metric | Before (54 Activities) | After (Single Activity) |
|--------|----------------------|------------------------|
| Memory per screen | ~2-5 MB (Activity overhead) | ~0.5-1 MB (Fragment/Composable) |
| Navigation transitions | System-controlled | Custom, fluid animations |
| State sharing | SharedPreferences/Singletons | ViewModel scoping |
| Deep linking | Manual Intent handling | Declarative NavGraph |
| Testing | 54 Activity test setups | Unified test harness |
| Build time | Longer (more classes) | Shorter (fewer entry points) |

## Timeline Estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Foundation | 1-2 weeks | Low |
| Phase 2: Navigation Graph | 1 week | Low |
| Phase 3: Activity Consolidation | 4-6 weeks | Medium |
| Phase 4: Cleanup | 1 week | Low |
| **Total** | **7-10 weeks** | **Medium** |

## References

- [Android Navigation Component](https://developer.android.com/guide/navigation)
- [Single Activity Architecture](https://www.youtube.com/watch?v=2k8x8V77CrU) (Android Dev Summit)
- [Jetpack Compose Navigation](https://developer.android.com/jetpack/compose/navigation)
