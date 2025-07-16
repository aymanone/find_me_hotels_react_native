import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Icon, Button } from 'react-native-elements';

// Import screens
import SignupScreen from '../screens/SignupScreen';
import SigninScreen from '../screens/SigninScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ClientTravelRequestList from '../screens/ClientTravelRequestListScreen';
import ClientTravelRequestDetailsScreen from '../screens/ClientTravelRequestDetailsScreen';
import TravelRequestForm from '../screens/TravelRequestForm';
import OfferDetailsScreen from '../screens/OfferDetailsScreen';
import AdminCreateCompanyFormScreen from '../screens/AdminCreateCompanyFormScreen';
import CompanyCreateAgentFormScreen from '../screens/CompanyCreateAgentFormScreen';
import AgentSearchTravelRequestsScreen from '../screens/AgentSearchTravelRequestsScreen';
import AgentTravelRequestDetailsScreen from '../screens/AgentTravelRequestDetailsScreen';
import ClientOfferDetailsScreen from '../screens/ClientOfferDetailsScreen';
import CompanyAgentsListScreen from '../screens/CompanyAgentsListScreen';
import CompanyAgentProfileScreen from '../screens/CompanyAgentProfileScreen';
import CompanyCompanyProfileScreen from '../screens/CompanyCompanyProfileScreen';
import AgentAgentProfileScreen from '../screens/AgentAgentProfileScreen';
import AgentAgentOffersScreen from '../screens/AgentAgentOffersScreen';
import AdminCompanyProfileScreen from '../screens/AdminCompanyProfileScreen';
import AdminCompaniesListScreen from '../screens/AdminCompaniesListScreen';
import AgentUpdatedRequestsScreen from '../screens/AgentUpdatedRequestsScreen';
import ClientClientProfileScreen from '../screens/ClientClientProfileScreen';
import AdminAdminProfileScreen from '../screens/AdminAdminProfileScreen';
import ClientUpdatedRequestsScreen from '../screens/ClientUpdatedRequestsScreen';
import { signOut } from '../utils/auth';
import { 
  setupClientChannels, 
  setupAgentChannels, 
  setupCompanyChannels, 
  setupAdminChannels 
} from '../utils/channelUtils';
import supabase from '../config/supabase';
import { Linking } from 'react-native';
import UpdatedRequestsBadge from '../components/UpdatedRequestsBadge';
import ClientNewOffersBadge from '../components/ClientNewOffersBadge';
// Create navigators - Move outside component to prevent recreation
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Optimize screen components with React.memo and proper comparison
const MemoizedTravelRequestForm = React.memo(TravelRequestForm);
const MemoizedClientTravelRequestList = React.memo(ClientTravelRequestList);
const MemoizedAgentSearchTravelRequests = React.memo(AgentSearchTravelRequestsScreen);
const MemoizedAgentAgentOffers = React.memo(AgentAgentOffersScreen);
const MemoizedCompanyCreateAgentForm = React.memo(CompanyCreateAgentFormScreen);
const MemoizedCompanyAgentsList = React.memo(CompanyAgentsListScreen);
const MemoizedAdminCreateCompanyForm = React.memo(AdminCreateCompanyFormScreen);
const MemoizedAdminCompaniesList = React.memo(AdminCompaniesListScreen);

// Memoized components for better performance
const MemoizedSignOutScreen = React.memo(function SignOutScreen({ navigation }) {
  useEffect(() => {
    const handleSignOut = async () => {
      try {
        await signOut(navigation, 'Signin');
      } catch (error) {
        console.error('Error signing out:', error.message);
        navigation.navigate('Signin');
      }
    };
    
    handleSignOut();
  }, [navigation]);
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Signing out...</Text>
    </View>
  );
});

const MemoizedPlaceholderScreen = React.memo(function PlaceholderScreen({ title }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{title || 'Coming Soon'}</Text>
    </View>
  );
});

// Improved tab screen options with memoization
const createTabScreenOptions = () => (route) => ({
  tabBarIcon: ({ focused, color, size }) => {
    const iconMap = {
      'NewRequest': focused ? 'add-circle' : 'add-circle-outline',
      'Requests': focused ? 'list' : 'list-outline',
      'SearchRequests': focused ? 'search' : 'search-outline',
      'MyOffers': focused ? 'pricetag' : 'pricetag-outline',
      'Create Agent': focused ? 'people' : 'people-outline',
      'Agents': focused ? 'list' : 'list-outline',
      'Create Company': focused ? 'people' : 'people-outline',
      'Analytics': focused ? 'analytics' : 'analytics-outline',
      'My Companies': focused ? 'analytics' : 'analytics-outline',
    };
    
    const iconName = iconMap[route.name] || 'help-outline';
    return <Icon name={iconName} type="ionicon" size={size} color={color} />;
  },
  headerShown: false,
});

// Improved tab listeners with proper stack reset
const createTabListeners = () => (navigation) => ({
  tabPress: (e) => {
    const targetRouteName = e.target.split('-')[0];
    
    // Properly reset the tab's stack to prevent memory buildup
    navigation.reset({
      index: 0,
      routes: [{ name: targetRouteName }],
    });
  },
});

// Memoized drawer screen options
const createDrawerScreenOptions = () => (navigation) => ({
  headerShown: true,
  headerLeft: () => (
    <Button
      icon={{
        name: "menu",
        type: "ionicon",
        size: 24,
        color: "#333"
      }}
      type="clear"
      onPress={() => navigation.toggleDrawer()}
      containerStyle={{ marginLeft: 10 }}
    />
  ),
  drawerStyle: {
    backgroundColor: '#f8f8f8',
    width: '70%',
  },
  drawerType: 'front',
  overlayColor: 'rgba(0,0,0,0.5)',
  swipeEnabled: true,
});

// CLIENT NAVIGATION
// =================

const ClientStack = React.memo(function ClientStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="ClientTravelRequestDetails" component={ClientTravelRequestDetailsScreen} />
      <Stack.Screen name="ClientOfferDetails" component={ClientOfferDetailsScreen} />
     <Stack.Screen name="ClientUpdatedRequests" component={ClientUpdatedRequestsScreen} />
    </Stack.Navigator>
  );
});

const ClientTabs = React.memo(function ClientTabs() {
  const screenOptions = useMemo(() => createTabScreenOptions(), []);
  const screenListeners = useMemo(() => createTabListeners(), []);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => screenOptions(route)}
      screenListeners={({ navigation }) => screenListeners(navigation)}
    >
      <Tab.Screen 
        name="NewRequest" 
        component={MemoizedTravelRequestForm}
        options={{ title: 'New Request' }}
      />
      <Tab.Screen 
        name="Requests" 
        component={MemoizedClientTravelRequestList}
        options={{ title: 'My Requests' }}
      />
    </Tab.Navigator>
  );
});

const ClientDrawer = React.memo(function ClientDrawer() {
  const screenOptions = useMemo(() => createDrawerScreenOptions(), []);
  
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => screenOptions(navigation)}
    >
      <Drawer.Screen 
        name="Home" 
        component={ClientStack} 
        options={{
          title: 'Home',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
       listeners={({ navigation }) => ({
    drawerItemPress: (e) => {
      // Prevent default drawer navigation
      e.preventDefault();
      
      // Reset the entire stack to the initial state
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Home',
            state: {
              routes: [
                {
                  name: 'ClientTabs',
                  state: {
                    index: 0,
                    routes: [{ name: 'NewRequest' }]
                  }
                }
              ]
            }
          }
        ]
      });
      
      // Close the drawer
      navigation.closeDrawer();
    },
  })}
      />
         <Drawer.Screen 
  name="ClientUpdatedRequestsDrawer" // Different name to avoid conflicts
  component={ClientUpdatedRequestsScreen}
  options={{
    title: 'Updated Requests',
    drawerIcon: ({ color }) => (
     // <Icon name="refresh-outline" type="ionicon" size={22} color={color} />
      <View style={{ position: 'relative' }}>
              <Icon name="refresh-outline" type="ionicon" size={22} color={color} />
              <ClientNewOffersBadge />
            </View>
    ),
  }}
  listeners={({ navigation }) => ({
    drawerItemPress: (e) => {
      // Prevent default drawer navigation
      e.preventDefault();
      
      // Navigate to the stack version instead
      navigation.navigate('Home', {
        screen: 'ClientUpdatedRequests'
      });
    },
  })}
/>
      <Drawer.Screen 
        name="Profile" 
        component={ClientClientProfileScreen}
        options={{
          title: 'My Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="SignOut" 
        component={MemoizedSignOutScreen}
        options={{
          title: 'Sign Out',
          drawerIcon: ({ color }) => (
            <Icon name="exit-outline" type="ionicon" size={22} color="#FF3B30" />
          ),
          drawerLabelStyle: {
            color: '#FF3B30'
          }
        }}
      />
    </Drawer.Navigator>
  );
});

// AGENT NAVIGATION (Similar pattern)
const AgentStack = React.memo(function AgentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AgentTabs" component={AgentTabs} />
      <Stack.Screen name="AgentUpdatedRequests" component={AgentUpdatedRequestsScreen} />
      <Stack.Screen name="AgentTravelRequestDetails" component={AgentTravelRequestDetailsScreen} />
    </Stack.Navigator>
  );
});

const AgentTabs = React.memo(function AgentTabs() {
  const screenOptions = useMemo(() => createTabScreenOptions(), []);
  const screenListeners = useMemo(() => createTabListeners(), []);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => screenOptions(route)}
      screenListeners={({ navigation }) => screenListeners(navigation)}
    >
      <Tab.Screen 
        name="SearchRequests" 
        component={MemoizedAgentSearchTravelRequests}
        options={{ title: 'Search Requests' }}
      />
      <Tab.Screen 
        name="MyOffers" 
        component={MemoizedAgentAgentOffers}
        options={{ title: 'My Offers' }}
      />
    </Tab.Navigator>
  );
});

const AgentDrawer = React.memo(function AgentDrawer() {
  const screenOptions = useMemo(() => createDrawerScreenOptions(), []);
  
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => screenOptions(navigation)}
    >
      <Drawer.Screen 
        name="Home" 
        component={AgentStack} 
        options={{
          title: 'Search Requests',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
    drawerItemPress: (e) => {
      // Prevent default drawer navigation
      e.preventDefault();
      
      // Reset the entire stack to the initial state
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Home',
            state: {
              routes: [
                {
                  name: 'AgentTabs',
                  state: {
                    index: 0,
                    routes: [{ name: 'SearchRequests' }]
                  }
                }
              ]
            }
          }
        ]
      });
      
      // Close the drawer
      navigation.closeDrawer();
    },
  })}
      />
      
    <Drawer.Screen 
  name="AgentUpdatedRequestsDrawer" // Different name to avoid conflicts
  component={AgentUpdatedRequestsScreen}
  options={{
    title: 'Updated Requests',
    drawerIcon: ({ color }) => (
     // <Icon name="refresh-outline" type="ionicon" size={22} color={color} />
      <View style={{ position: 'relative' }}>
              <Icon name="refresh-outline" type="ionicon" size={22} color={color} />
              <UpdatedRequestsBadge />
            </View>
    ),
  }}
  listeners={({ navigation }) => ({
    drawerItemPress: (e) => {
      // Prevent default drawer navigation
      e.preventDefault();
      
      // Navigate to the stack version instead
      navigation.navigate('Home', {
        screen: 'AgentUpdatedRequests'
      });
    },
  })}
/>
      
      <Drawer.Screen 
        name="Profile" 
        component={AgentAgentProfileScreen}
        options={{
          title: 'My Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="SignOut" 
        component={MemoizedSignOutScreen}
        options={{
          title: 'Sign Out',
          drawerIcon: ({ color }) => (
            <Icon name="exit-outline" type="ionicon" size={22} color="#FF3B30" />
          ),
          drawerLabelStyle: {
            color: '#FF3B30'
          }
        }}
      />
    </Drawer.Navigator>
  );
});

// COMPANY NAVIGATION
const CompanyTabs = React.memo(function CompanyTabs() {
  const screenOptions = useMemo(() => createTabScreenOptions(), []);
  
  return (
    <Tab.Navigator screenOptions={({ route }) => screenOptions(route)}>
      <Tab.Screen 
        name="Create Agent"
        component={MemoizedCompanyCreateAgentForm}
        options={{ title: 'Create Agent', headerShown: false }}
      />
      <Tab.Screen 
        name="Agents" 
        component={MemoizedCompanyAgentsList}
        options={{ title: 'My Agents', headerShown: false }}
      />
      <Tab.Screen 
        name="Requests" 
        component={() => <MemoizedPlaceholderScreen title="Company Requests" />}
        options={{ title: 'Requests', headerShown: false }}
      />
    </Tab.Navigator>
  );
});

const CompanyDrawer = React.memo(function CompanyDrawer() {
  const screenOptions = useMemo(() => createDrawerScreenOptions(), []);
  
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => screenOptions(navigation)}
    >
      <Drawer.Screen 
        name="Home" 
        component={CompanyTabs} 
        options={{
          title: 'Company Dashboard',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="CompanyAgentProfile" 
        component={CompanyAgentProfileScreen}
        options={{
          title: 'Agent Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' },
        }}
      />
      
      <Drawer.Screen 
        name="Profile" 
        component={CompanyCompanyProfileScreen}
        options={{
          title: 'My Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="SignOut" 
        component={MemoizedSignOutScreen}
        options={{
          title: 'Sign Out',
          drawerIcon: ({ color }) => (
            <Icon name="exit-outline" type="ionicon" size={22} color="#FF3B30" />
          ),
          drawerLabelStyle: {
            color: '#FF3B30'
          }
        }}
      />
    </Drawer.Navigator>
  );
});

// ADMIN NAVIGATION
const AdminTabs = React.memo(function AdminTabs() {
  const screenOptions = useMemo(() => createTabScreenOptions(), []);
  
  return (
    <Tab.Navigator screenOptions={({ route }) => screenOptions(route)}>
      <Tab.Screen 
        name="Create Company"
        component={MemoizedAdminCreateCompanyForm} 
        options={{ title: 'Create Company', headerShown: false }}
      />
      <Tab.Screen 
        name="My Companies" 
        component={MemoizedAdminCompaniesList}
        options={{ title: 'My Companies', headerShown: false }}
      />
    </Tab.Navigator>
  );
});

const AdminDrawer = React.memo(function AdminDrawer() {
  const screenOptions = useMemo(() => createDrawerScreenOptions(), []);
  
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => screenOptions(navigation)}
    >
      <Drawer.Screen 
        name="Home" 
        component={AdminTabs} 
        options={{
          title: 'Admin Dashboard',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="AdminCompanyProfile" 
        component={AdminCompanyProfileScreen}
        options={{
          title: 'Company Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' },
        }}
      />
      
      <Drawer.Screen 
        name="Profile" 
        component={AdminAdminProfileScreen}
        options={{
          title: 'My Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="SignOut" 
        component={MemoizedSignOutScreen}
        options={{
          title: 'Sign Out',
          drawerIcon: ({ color }) => (
            <Icon name="exit-outline" type="ionicon" size={22} color="#FF3B30" />
          ),
          drawerLabelStyle: {
            color: '#FF3B30'
          }
        }}
      />
    </Drawer.Navigator>
  );
});

export default function AppNavigator({navigationRef}) {
  
  const [session, setSession] = useState(null);
  const [userType, setUserType] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const channelsRef = useRef([]);
  const appStateRef = useRef(appState);

  // Memoized sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      await signOut(null, 'Signin');
    } catch (error) {
      console.error('Error signing out:', error);
      // Handle error appropriately
    }
  }, []);
  const linking = {
  prefixes: ['findmehotels://', 'https://findmehotels.com', 'http://findmehotels.com'],
  config: {
    screens: {
      // Auth screens
      Signin: 'signin',
      Signup: 'signup',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
      
      // Client routes
      ClientApp: {
        screens: {
          Home: {
            screens: {
              ClientTabs: {
                screens: {
                  Requests: 'client/requests',
                  NewRequest: 'client/new-request'
                }
              },
              ClientTravelRequestDetails: 'client/request/:id',
              ClientOfferDetails: 'client/offer/:id',
              ClientUpdatedRequests: 'client/updated-requests'
            }
          },
          Profile: 'client/profile'
        }
      },
      
      // Agent routes
      AgentApp: {
        screens: {
          Home: {
            screens: {
              AgentTabs: {
                screens: {
                  SearchRequests: 'agent/search',
                  MyOffers: 'agent/offers'
                }
              },
              AgentTravelRequestDetails: 'agent/request/:id',
              AgentUpdatedRequests: 'agent/updated-requests'
            }
          },
          Profile: 'agent/profile'
        }
      },
      
      // Company routes
      CompanyApp: {
        screens: {
          Home: 'company/dashboard',
          Profile: 'company/profile',
          CompanyAgentProfile: 'company/agent/:id'
        }
      },
      
      // Admin routes
      AdminApp: {
        screens: {
          Home: 'admin/dashboard',
          Profile: 'admin/profile',
          AdminCompanyProfile: 'admin/company/:id'
        }
      }
    }
  },
};

  // Handle app state changes (foreground, background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App is going to background or becoming inactive
        console.log('App going to background - removing all channels');
        supabase.removeAllChannels();
      }
      else if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App coming back to foreground - setup channels again if user is logged in
        if (session?.user) {
          setupUserChannels(session.user.app_metadata.role, session.user.id);
        }
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState,session]);

 const setupUserChannels = (role, userId) => {
    // Clean up any existing channels first
    if (channelsRef.current.length > 0) {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    }

    // Create a sign out handler that uses the existing signOut function
    const handleSignOut = async () => {
      try {
        await signOut(null, 'Signin');
      } catch (error) {
        console.error('Error signing out:', error);
        navigation.navigate('Signin');
      }
    };
      
    switch (role) {
      case 'client':
        //channels = setupClientChannels(userId, handleSignOut);
        break;
      case 'agent':
        
        break;
      case 'company':
      
        break;
      case 'admin':
        break;
      default:
        console.log('Unknown user role:', role);
    }

    

  };

  //auth state management
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUserType(session.user.app_metadata.role);
        setupUserChannels(session.user.app_metadata.role, session.user.id);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUserType(session.user.app_metadata.role);
      }
      else{
        setUserType(null);
          if (channelsRef.current.length > 0) {
            supabase.removeAllChannels();
            channelsRef.current = [];
        }
      }
    });
    return () => {
      if (channelsRef.current.length > 0) {
        supabase.removeAllChannels();
            channelsRef.current = [];
      }
    } ;
  }, []);
  // Memoized navigation components
  const authScreens = useMemo(() => (
    <>
      <Stack.Screen 
        name="Signin" 
        component={SigninScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Signup" 
        component={SignupScreen}
        options={{ headerShown: false }}
      />
    <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
     />
   <Stack.Screen 
        name="ResetPassword" 
        component={ResetPasswordScreen}
        options={{ headerShown: false }}
    />
    </>
  ), []);

  const appScreens = useMemo(() => {
    if (!userType) return null;
    
    const screenConfigs = {
      client: { name: 'ClientApp', component: ClientDrawer },
      agent: { name: 'AgentApp', component: AgentDrawer },
      company: { name: 'CompanyApp', component: CompanyDrawer },
      admin: { name: 'AdminApp', component: AdminDrawer },
    };
    
    const config = screenConfigs[userType];
    if (!config) return null;
    
    return (
      <Stack.Screen 
        name={config.name} 
        component={config.component}
        options={{ headerShown: false }}
      />
    );
  }, [userType]);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator>
        {!session ? authScreens : appScreens}
      </Stack.Navigator>
    </NavigationContainer>
  );
}