import React, { useState, useEffect, useRef } from 'react';
import { AppState, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Icon, Button } from 'react-native-elements';

// Import screens
import SignupScreen from '../screens/SignupScreen';
import SigninScreen from '../screens/SigninScreen';
import ClientTravelRequestList from '../screens/ClientTravelRequestListScreen';
import ClientTravelRequestDetailsScreen from '../screens/ClientTravelRequestDetailsScreen';
import TravelRequestForm from '../screens/travel_request_form';
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

import { signOut } from '../utils/auth';
import { 
  setupClientChannels, 
  setupAgentChannels, 
  setupCompanyChannels, 
  setupAdminChannels 
} from '../utils/channelUtils';
import supabase from '../config/supabase';

// Create navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Optimize screen components with React.memo
const MemoizedTravelRequestForm = React.memo(TravelRequestForm);
const MemoizedClientTravelRequestList = React.memo(ClientTravelRequestList);
const MemoizedAgentSearchTravelRequests = React.memo(AgentSearchTravelRequestsScreen);
const MemoizedAgentAgentOffers = React.memo(AgentAgentOffersScreen);
const MemoizedCompanyCreateAgentForm = React.memo(CompanyCreateAgentFormScreen);
const MemoizedCompanyAgentsList = React.memo(CompanyAgentsListScreen);
const MemoizedAdminCreateCompanyForm = React.memo(AdminCreateCompanyFormScreen);
const MemoizedAdminCompaniesList = React.memo(AdminCompaniesListScreen);

// Sign Out Screen
function SignOutScreen({ navigation }) {
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
    return () => {};
  }, [navigation]);
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Signing out...</Text>
    </View>
  );
}

// Placeholder component
function PlaceholderScreen({ title }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{title || 'Coming Soon'}</Text>
    </View>
  );
}

// CLIENT NAVIGATION
// =================

// CLIENT STACK - Contains client screens with history reset
function ClientStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="ClientTravelRequestDetails" component={ClientTravelRequestDetailsScreen} />
      <Stack.Screen name="ClientOfferDetails" component={ClientOfferDetailsScreen} />
    </Stack.Navigator>
  );
}

// Client tabs
function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'NewRequest') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Requests') {
            iconName = focused ? 'list' : 'list-outline';
          }
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
        headerShown: false,
      })}
      screenListeners={({ navigation }) => ({
        tabPress: (e) => {
          // Reset stack when switching tabs to avoid keeping many screens
          const targetRouteName = e.target.split('-')[0];
          navigation.navigate(targetRouteName);
        },
      })}
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
}

// CLIENT DRAWER
function ClientDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => ({
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
      })}
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
          drawerItemPress: () => {
            // Reset to initial state when pressing drawer item
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home', state: { routes: [{ name: 'ClientTabs' }] } }],
            });
          },
        })}
      />
      
      <Drawer.Screen 
        name="Profile" 
        component={PlaceholderScreen}
        options={{
          title: 'My Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="SignOut" 
        component={SignOutScreen}
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
}

// AGENT NAVIGATION
// ===============

// AGENT STACK
function AgentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AgentTabs" component={AgentTabs} />
      <Stack.Screen name="AgentTravelRequestDetails" component={AgentTravelRequestDetailsScreen} />
    </Stack.Navigator>
  );
}

// Agent tabs
function AgentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'SearchRequests') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'MyOffers') {
            iconName = focused ? 'pricetag' : 'pricetag-outline';
          }
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
        headerShown: false,
      })}
      screenListeners={({ navigation }) => ({
        tabPress: (e) => {
          // Reset stack when switching tabs
          const targetRouteName = e.target.split('-')[0];
          navigation.navigate(targetRouteName);
        },
      })}
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
}

// AGENT DRAWER
function AgentDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => ({
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
      })}
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
          drawerItemPress: () => {
            // Reset to initial state when pressing drawer item
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home', state: { routes: [{ name: 'AgentTabs' }] } }],
            });
          },
        })}
      />
      
      <Drawer.Screen 
        name="AgentUpdatedRequests" 
        component={AgentUpdatedRequestsScreen}
        options={{
          title: 'Updated Requests',
          drawerIcon: ({ color }) => (
            <Icon name="refresh-outline" type="ionicon" size={22} color={color} />
          ),
        }}
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
        component={SignOutScreen}
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
}

// COMPANY NAVIGATION
// company AgentFlow
const CompanyAgentStack = Stack;
function CompanyAgentFlow() {
  return (
       <CompanyAgentStack.Navigator 
      initialRouteName="CompanyAgentProfile"
      screenOptions={{ headerShown: false }}
    >
      <CompanyAgentStack.Screen 
        name="CompanyAgentProfile" 
        component={CompanyAgentProfileScreen} 
      />
    
    </CompanyAgentStack.Navigator>
  );}

// Company tabs
function CompanyTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Create Agent') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Agents') {
            iconName = focused ? 'list' : 'list-outline';
          }
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
      })}
    > 
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
        component={() => <PlaceholderScreen title="Company Requests" />}
        options={{ title: 'Requests', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

// Company Profile Screen (specific to companies only)
function CompanyProfileScreen() {
  return <PlaceholderScreen title="Company Profile - Settings & Billing" />;
}

// COMPANY DRAWER - Contains ALL company screens
function CompanyDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => ({
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
      })}
    >
      {/* HOME - Contains the main company tabs */}
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
      
      {/* COMPANY-SPECIFIC NESTED SCREENS */}
      <Drawer.Screen 
        name="CompanyAgentProfile" 
        component={CompanyAgentProfileScreen}
        options={{
          title: 'Agent Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu but keep accessible
        }}
      />
      
      <Drawer.Screen 
        name="RequestDetails" 
        component={() => <PlaceholderScreen title="Request Details" />}
        options={{
          title: 'Request Details',
          drawerIcon: ({ color }) => (
            <Icon name="document-text-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu but keep accessible
        }}
      />
      
      {/* COMPANY PROFILE */}
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
      
      {/* SIGN OUT */}
      <Drawer.Screen 
        name="SignOut" 
        component={SignOutScreen}
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
}

// ADMIN NAVIGATION
// ---------------

// Admin tabs
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Create Company') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          }
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
      })}
    >
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
}

// Admin Profile Screen (specific to admins only)
function AdminProfileScreen() {
  return <PlaceholderScreen title="Admin Profile - System Settings" />;
}

// ADMIN DRAWER - Contains ALL admin screens
function AdminDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => ({
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
      })}
    >
      {/* HOME - Contains the main admin tabs */}
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
      
      {/* ADMIN-SPECIFIC NESTED SCREENS */}
      <Drawer.Screen 
        name="AdminCompanyProfile" 
        component={AdminCompanyProfileScreen}
        options={{
          title: 'Company Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu but keep accessible
        }}
      />
      
      <Drawer.Screen 
        name="AnalyticsReport" 
        component={() => <PlaceholderScreen title="Analytics Report" />}
        options={{
          title: 'Analytics Report',
          drawerIcon: ({ color }) => (
            <Icon name="bar-chart-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu but keep accessible
        }}
      />
      
      {/* ADMIN PROFILE */}
      <Drawer.Screen 
        name="Profile" 
        component={AdminProfileScreen}
        options={{
          title: 'My Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      {/* SIGN OUT */}
      <Drawer.Screen 
        name="SignOut" 
        component={SignOutScreen}
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
}

export default function AppNavigator() {
  const [session, setSession] = useState(null);
  const [userType, setUserType] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const channelsRef=useRef([]);
   
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

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!session ? (
          // Auth screens
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
          </>
        ) : (
          // App screens - Each user type gets their own complete drawer
          <>
            {userType === 'client' ? (
              <Stack.Screen 
                name="ClientApp" 
                component={ClientDrawer}
                options={{ headerShown: false }}
              />
            ) : userType === 'agent' ? (
              <Stack.Screen 
                name="AgentApp" 
                component={AgentDrawer}
                options={{ headerShown: false }}
              />
            ) : userType === 'company' ? (
              <Stack.Screen 
                name="CompanyApp" 
                component={CompanyDrawer}
                options={{ headerShown: false }}
              />
            ) : userType === 'admin' ? (
              <Stack.Screen 
                name="AdminApp" 
                component={AdminDrawer}
                options={{ headerShown: false }}
              />
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}