import React, {useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet} from 'react-native';
import {Colors, FontSize} from '../theme/colors';
import {t} from '../i18n';

// Screens
import LockScreen from '../screens/LockScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import ContactsScreen from '../screens/ContactsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VoiceCallScreen from '../screens/VoiceCallScreen';
import AddFriendScreen from '../screens/AddFriendScreen';
import WalletScreen from '../screens/WalletScreen';
// Group screens
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import GroupProfileScreen from '../screens/GroupProfileScreen';
// Call screens
import CallHistoryScreen from '../screens/CallHistoryScreen';
import IncomingCallScreen from '../screens/IncomingCallScreen';
import NewCallScreen from '../screens/NewCallScreen';
// Contact screens
import ContactInfoScreen from '../screens/ContactInfoScreen';
import FriendRequestsScreen from '../screens/FriendRequestsScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import QRCodeScreen from '../screens/QRCodeScreen';
// Auth screens
import WelcomeScreen from '../screens/WelcomeScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import RestoreAccountScreen from '../screens/RestoreAccountScreen';
import AccountCreatedScreen from '../screens/AccountCreatedScreen';
// Security screens
import DuressPinScreen from '../screens/DuressPinScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import AutoLockScreen from '../screens/AutoLockScreen';
import WipeAccountScreen from '../screens/WipeAccountScreen';
import SecurityModeScreen from '../screens/SecurityModeScreen';
// Network screens
import TorStatusScreen from '../screens/TorStatusScreen';
import BridgeConfigScreen from '../screens/BridgeConfigScreen';
import CommunicationModeScreen from '../screens/CommunicationModeScreen';
// Settings screens
import NotificationsScreen from '../screens/NotificationsScreen';
import BackupSeedScreen from '../screens/BackupSeedScreen';
import DeveloperScreen from '../screens/DeveloperScreen';
import SystemLogScreen from '../screens/SystemLogScreen';
import AboutScreen from '../screens/AboutScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import LicenseScreen from '../screens/LicenseScreen';
// Wallet screens
import SendMoneyScreen from '../screens/SendMoneyScreen';
import ReceiveScreen from '../screens/ReceiveScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import CreateWalletScreen from '../screens/CreateWalletScreen';
import ImportWalletScreen from '../screens/ImportWalletScreen';
import WalletSettingsScreen from '../screens/WalletSettingsScreen';
// New screens matching Android
import VideoCallScreen from '../screens/VideoCallScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import TotpSetupScreen from '../screens/TotpSetupScreen';
import SwapScreen from '../screens/SwapScreen';
import LanguageScreen from '../screens/LanguageScreen';

// ─── Type Definitions ───

export type RootStackParamList = {
  Lock: undefined;
  Welcome: undefined;
  CreateAccount: undefined;
  RestoreAccount: undefined;
  AccountCreated: undefined;
  Main: undefined;
  Chat: {contactId: string; contactName: string};
  ContactInfo: {contactId: string};
  AddFriend: undefined;
  FriendRequests: undefined;
  VoiceCall: {contactId: string; contactName: string};
  IncomingCall: {contactName: string; contactId: string; isVideo?: boolean};
  CallHistory: undefined;
  NewCall: undefined;
  CreateGroup: undefined;
  GroupChat: {groupId: string; groupName: string; memberCount?: number};
  GroupProfile: {groupId: string; groupName: string};
  QRCode: undefined;
  QRScanner: undefined;
  DuressPin: undefined;
  ChangePassword: undefined;
  AutoLock: undefined;
  WipeAccount: undefined;
  SecurityMode: undefined;
  TorStatus: undefined;
  BridgeConfig: undefined;
  CommunicationMode: undefined;
  BackupSeed: undefined;
  Notifications: undefined;
  Developer: undefined;
  SystemLog: undefined;
  About: undefined;
  Wallet: undefined;
  SendMoney: {address?: string};
  Receive: undefined;
  Transactions: undefined;
  TransactionDetail: {tx: any};
  CreateWallet: undefined;
  ImportWallet: undefined;
  WalletSettings: undefined;
  Privacy: undefined;
  License: undefined;
  VideoCall: {contactId: string; contactName: string};
  Subscription: undefined;
  TotpSetup: undefined;
  Swap: undefined;
  Language: undefined;
};

export type MainTabParamList = {
  Chats: undefined;
  Contacts: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Tab Icons ───

const TabIcon: React.FC<{name: string; focused: boolean}> = ({name, focused}) => {
  const icons: Record<string, string> = {
    Chats: '💬',
    Contacts: '👥',
    Settings: '⚙️',
  };
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {icons[name] || '?'}
      </Text>
    </View>
  );
};

// ─── Main Tabs ───

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textTertiary,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({focused}) => <TabIcon name={route.name} focused={focused} />,
    })}>
    <Tab.Screen name="Chats" component={ChatListScreen} options={{tabBarLabel: t('chats')}} />
    <Tab.Screen name="Contacts" component={ContactsScreen} options={{tabBarLabel: t('contacts')}} />
    <Tab.Screen name="Settings" component={SettingsScreen} options={{tabBarLabel: t('settings')}} />
  </Tab.Navigator>
);

// ─── Root Navigator ───

const AppNavigator = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: Colors.primary,
          background: Colors.background,
          card: Colors.surface,
          text: Colors.textPrimary,
          border: Colors.border,
          notification: Colors.primary,
        },
        fonts: {
          regular: {fontFamily: 'System', fontWeight: '400'},
          medium: {fontFamily: 'System', fontWeight: '500'},
          bold: {fontFamily: 'System', fontWeight: '700'},
          heavy: {fontFamily: 'System', fontWeight: '900'},
        },
      }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {backgroundColor: Colors.background},
        }}>
        {!isUnlocked ? (
          <Stack.Screen name="Lock">
            {props => <LockScreen {...props} onUnlock={() => setIsUnlocked(true)} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            {/* Chat & Groups */}
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="GroupChat" component={GroupChatScreen} />
            <Stack.Screen name="GroupProfile" component={GroupProfileScreen} />
            {/* Contacts */}
            <Stack.Screen name="AddFriend" component={AddFriendScreen} />
            <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />
            <Stack.Screen name="ContactInfo" component={ContactInfoScreen} />
            <Stack.Screen name="QRCode" component={QRCodeScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            {/* Calls */}
            <Stack.Screen name="VoiceCall" component={VoiceCallScreen} />
            <Stack.Screen name="IncomingCall" component={IncomingCallScreen} />
            <Stack.Screen name="CallHistory" component={CallHistoryScreen} />
            <Stack.Screen name="NewCall" component={NewCallScreen} />
            {/* Auth */}
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
            <Stack.Screen name="RestoreAccount" component={RestoreAccountScreen} />
            <Stack.Screen name="AccountCreated" component={AccountCreatedScreen} />
            {/* Security */}
            <Stack.Screen name="DuressPin" component={DuressPinScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="AutoLock" component={AutoLockScreen} />
            <Stack.Screen name="WipeAccount" component={WipeAccountScreen} />
            <Stack.Screen name="SecurityMode" component={SecurityModeScreen} />
            {/* Network */}
            <Stack.Screen name="TorStatus" component={TorStatusScreen} />
            <Stack.Screen name="BridgeConfig" component={BridgeConfigScreen} />
            <Stack.Screen name="CommunicationMode" component={CommunicationModeScreen} />
            {/* Settings & Info */}
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="BackupSeed" component={BackupSeedScreen} />
            <Stack.Screen name="Developer" component={DeveloperScreen} />
            <Stack.Screen name="SystemLog" component={SystemLogScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
            <Stack.Screen name="License" component={LicenseScreen} />
            {/* Wallet */}
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="SendMoney" component={SendMoneyScreen} />
            <Stack.Screen name="Receive" component={ReceiveScreen} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
            <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
            <Stack.Screen name="ImportWallet" component={ImportWalletScreen} />
            <Stack.Screen name="WalletSettings" component={WalletSettingsScreen} />
            {/* New screens matching Android */}
            <Stack.Screen name="VideoCall" component={VideoCallScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            <Stack.Screen name="TotpSetup" component={TotpSetupScreen} />
            <Stack.Screen name="Swap" component={SwapScreen} />
            <Stack.Screen name="Language" component={LanguageScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.divider,
    borderTopWidth: 1,
    height: 85,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabLabel: {fontSize: FontSize.xs, fontWeight: '500'},
  tabIconContainer: {alignItems: 'center', justifyContent: 'center'},
  tabIcon: {fontSize: 22, opacity: 0.5},
  tabIconFocused: {opacity: 1},
});

export default AppNavigator;
