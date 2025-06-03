import React, { useState, useEffect } from 'react';
import {AppState} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import SignupScreen from '../screens/SignupScreen';
import supabase from '../config/supabase';
import { Icon, Button } from 'react-native-elements';
import SigninScreen from '../screens/SigninScreen';
import ClientTravelRequestList from '../screens/ClientTravelRequestListScreen';
import ClientTravelRequestDetailsScreen from '../screens/ClientTravelRequestDetailsScreen';
import TravelRequestForm from '../screens/TravelRequestForm'; 
import OfferDetailsScreen from '../screens/OfferDetailsScreen';
import AdminCreateCompanyFormScreen from '../screens/AdminCreateCompanyFormScreen';
import CompanyCreateAgentFormScreen from '../screens/CompanyCreateAgentFormScreen';
import AgentSearchTravelRequestsScreen from '../screens/AgentSearchTravelRequestsScreen';
import AgentTravelRequestDetailsScreen from '../screens/AgentTravelRequestDetailsScreen';
import { View, Text } from 'react-native';
import {signOut} from '../utils/auth';

// Create navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Simple placeholder screen for sign out functionality
function SignOutScreen() {
  useEffect(() => {
    const handleSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Error signing out:', error.message);
      }
    };
    
    handleSignOut();
    
    return () => {};
  }, []);
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Signing out...</Text>
    </View>
  );
}

// Placeholder component for screens not yet implemented
function PlaceholderScreen({ title }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{title || 'Coming Soon'}</Text>
    </View>
  );
}

// CLIENT NAVIGATION
// -----------------

// Client tabs
function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
           if (route.name === 'Requests') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'NewRequest') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          }
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
      })}
    >
       <Tab.Screen 
        name="NewRequest" 
        component={TravelRequestForm}
        options={{ title: 'New Request', headerShown: false }}
      />
      <Tab.Screen 
        name="Requests" 
        component={ClientTravelRequestList}
        options={{ title: 'My Requests', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

// Client Profile Screen (specific to clients only)
function ClientProfileScreen() {
  return <PlaceholderScreen title="Client Profile - My Bookings & Settings" />;
}

// CLIENT DRAWER - Contains ALL client screens
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
      {/* HOME - Contains the main client tabs */}
      <Drawer.Screen 
        name="Home" 
        component={ClientTabs} 
        options={{
          title: 'Find Me Hotels',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      {/* CLIENT-SPECIFIC NESTED SCREENS */}
      <Drawer.Screen 
        name="ClientTravelRequestDetails" 
        component={ClientTravelRequestDetailsScreen}
        options={{
          title: 'Request Details',
          drawerIcon: ({ color }) => (
            <Icon name="document-text-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu but keep accessible
        }}
      />
      
      <Drawer.Screen 
        name="OfferDetails" 
        component={OfferDetailsScreen}
        options={{
          title: 'Offer Details',
          drawerIcon: ({ color }) => (
            <Icon name="pricetag-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu but keep accessible
        }}
      />
      
      {/* CLIENT PROFILE */}
      <Drawer.Screen 
        name="Profile" 
        component={ClientProfileScreen}
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

// AGENT NAVIGATION
// ---------------

// Agent tabs
function AgentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'AvailableRequests') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'MyOffers') {
            iconName = focused ? 'pricetag' : 'pricetag-outline';
          }
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="AvailableRequests" 
        component={AgenSearchTravelRequestsScreen}
        options={{ title: 'Available Requests', headerShown: false }}
      />
      <Tab.Screen 
        name="MyOffers" 
        component={() => <PlaceholderScreen title="My Offers" />}
        options={{ title: 'My Offers', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

// Agent Profile Screen (specific to agents only)
function AgentProfileScreen() {
  return <PlaceholderScreen title="Agent Profile - My Performance & Earnings" />;
}

// AGENT DRAWER - Contains ALL agent screens
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
      {/* HOME - Contains the main agent tabs */}
      <Drawer.Screen 
        name="Home" 
        component={AgentTabs} 
        options={{
          title: 'Search Requests',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      
      {/* AGENT-SPECIFIC NESTED SCREENS */}
      <Drawer.Screen 
        name="RequestDetails" 
        component={AgentTravelRequestDetailsScreen}
        options={{
          title: 'Request Details',
          drawerIcon: ({ color }) => (
            <Icon name="document-text-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu but keep accessible
        }}
      />
      
      <Drawer.Screen 
        name="CreateOffer" 
        component={() => <PlaceholderScreen title="Create Offer" />}
        options={{
          title: 'Create Offer',
          drawerIcon: ({ color }) => (
            <Icon name="add-circle-outline" type="ionicon" size={22} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu but keep accessible
        }}
      />
      
      {/* AGENT PROFILE */}
      <Drawer.Screen 
        name="Profile" 
        component={AgentProfileScreen}
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

// COMPANY NAVIGATION
// -----------------

// Company tabs
function CompanyTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Create Agent') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Requests') {
            iconName = focused ? 'list' : 'list-outline';
          }
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
      })}
    > 
      <Tab.Screen 
        name="Create Agent"
        component={CompanyCreateAgentFormScreen} 
        options={{ title: 'Create Agent', headerShown: false }}
        
      />
      <Tab.Screen 
        name="Agents" 
        component={() => <PlaceholderScreen title="Company Agents" />}
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
        name="AgentDetails" 
        component={() => <PlaceholderScreen title="Agent Details" />}
        options={{
          title: 'Agent Details',
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
        component={CompanyProfileScreen}
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
        component={AdminCreateCompanyFormScreen} 
        options={{ title: 'Create Company', headerShown: false }}
        
      />
      <Tab.Screen 
        name="Analytics" 
        component={() => <PlaceholderScreen title="Admin Analytics" />}
        options={{ title: 'Analytics', headerShown: false }}
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
        name="UserDetails" 
        component={() => <PlaceholderScreen title="User Details" />}
        options={{
          title: 'User Details',
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
   
  // Handle app state changes (foreground, background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App is going to background or becoming inactive
        console.log('App going to background - removing all channels');
        supabase.removeAllChannels();
      }
      
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  //auth state management
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUserType(session.user.app_metadata.role);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUserType(session.user.app_metadata.role);
      }
      else{
        setUserType(null);
      }
    });
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