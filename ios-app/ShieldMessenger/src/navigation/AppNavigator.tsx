import React, {useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet} from 'react-native';
import {Colors, FontSize} from '../theme/colors';

// Screens
import LockScreen from '../screens/LockScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import ContactsScreen from '../screens/ContactsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VoiceCallScreen from '../screens/VoiceCallScreen';
import AddFriendScreen from '../screens/AddFriendScreen';
import WalletScreen from '../screens/WalletScreen';

// ─── Type Definitions ───

export type RootStackParamList = {
  Lock: undefined;
  Main: undefined;
  Chat: {contactId: string; contactName: string};
  ContactInfo: {contactId: string};
  AddFriend: undefined;
  FriendRequests: undefined;
  VoiceCall: {contactId: string; contactName: string};
  QRCode: undefined;
  QRScanner: undefined;
  DuressPin: undefined;
  ChangePassword: undefined;
  TorStatus: undefined;
  BackupSeed: undefined;
  Wallet: undefined;
  Privacy: undefined;
  License: undefined;
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
    <Tab.Screen name="Chats" component={ChatListScreen} options={{tabBarLabel: 'Chats'}} />
    <Tab.Screen name="Contacts" component={ContactsScreen} options={{tabBarLabel: 'Contacts'}} />
    <Tab.Screen name="Settings" component={SettingsScreen} options={{tabBarLabel: 'Settings'}} />
  </Tab.Navigator>
);

// ─── Placeholder for screens not yet built ───

const PlaceholderScreen: React.FC<{title: string}> = ({title}) => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>{title}</Text>
    <Text style={styles.placeholderSubtext}>Coming soon</Text>
  </View>
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
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="AddFriend" component={AddFriendScreen} />
            <Stack.Screen name="VoiceCall" component={VoiceCallScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="FriendRequests">
              {() => <PlaceholderScreen title="Friend Requests" />}
            </Stack.Screen>
            <Stack.Screen name="QRCode">
              {() => <PlaceholderScreen title="QR Code" />}
            </Stack.Screen>
            <Stack.Screen name="QRScanner">
              {() => <PlaceholderScreen title="QR Scanner" />}
            </Stack.Screen>
            <Stack.Screen name="ContactInfo">
              {() => <PlaceholderScreen title="Contact Info" />}
            </Stack.Screen>
            <Stack.Screen name="DuressPin">
              {() => <PlaceholderScreen title="Duress PIN Setup" />}
            </Stack.Screen>
            <Stack.Screen name="ChangePassword">
              {() => <PlaceholderScreen title="Change Password" />}
            </Stack.Screen>
            <Stack.Screen name="TorStatus">
              {() => <PlaceholderScreen title="Tor Network Status" />}
            </Stack.Screen>
            <Stack.Screen name="BackupSeed">
              {() => <PlaceholderScreen title="Backup Seed Phrase" />}
            </Stack.Screen>
            <Stack.Screen name="Privacy">
              {() => <PlaceholderScreen title="Privacy Policy" />}
            </Stack.Screen>
            <Stack.Screen name="License">
              {() => <PlaceholderScreen title="License" />}
            </Stack.Screen>
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
  placeholder: {
    flex: 1, backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  placeholderText: {fontSize: FontSize.xxl, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8},
  placeholderSubtext: {fontSize: FontSize.md, color: Colors.textTertiary},
});

export default AppNavigator;
