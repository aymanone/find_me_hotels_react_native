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
import { View, Text } from 'react-native';
import {signOut} from '../utils/auth';

// Create navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Stack navigators for each user type
const ClientStack = createNativeStackNavigator();
const AgentStack = createNativeStackNavigator();
const CompanyStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();

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
        options={{ title: 'New Request' }}
      />
      <Tab.Screen 
        name="Requests" 
        component={ClientTravelRequestList}
        options={{ title: 'My Requests' }}
      />
    </Tab.Navigator>
  );
}

// Client drawer
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
        component={ClientTabs} 
        options={{
          title: 'Find Me Hotels',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={() => <PlaceholderScreen title="Client Profile" />}
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

// Client Stack with nested screens
function ClientStackNavigator() {
  return (
    <ClientStack.Navigator>
      <ClientStack.Screen 
        name="ClientDrawer" 
        component={ClientDrawer} 
        options={{ headerShown: false }}
      />
      <ClientStack.Screen 
        name="ClientTravelRequestDetails" 
        component={ClientTravelRequestDetailsScreen}
        options={{ 
          headerShown: true,
          title: 'Request Details'
        }}
      />
       <ClientStack.Screen 
        name="OfferDetails" 
        component={OfferDetailsScreen}
        options={{ 
          headerShown: true,
          title: 'Offer Details'
        }}
        />
    </ClientStack.Navigator>
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
        component={() => <PlaceholderScreen title="Available Requests" />}
        options={{ title: 'Available Requests' }}
      />
      <Tab.Screen 
        name="MyOffers" 
        component={() => <PlaceholderScreen title="My Offers" />}
        options={{ title: 'My Offers' }}
      />
    </Tab.Navigator>
  );
}

// Agent drawer
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
        component={AgentTabs} 
        options={{
          title: 'Find Me Hotels',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={() => <PlaceholderScreen title="Agent Profile" />}
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

// Agent Stack with nested screens
function AgentStackNavigator() {
  return (
    <AgentStack.Navigator>
      <AgentStack.Screen 
        name="AgentDrawer" 
        component={AgentDrawer} 
        options={{ headerShown: false }}
      />
      <AgentStack.Screen 
        name="RequestDetails" 
        component={() => <PlaceholderScreen title="Request Details" />}
        options={{ 
          headerShown: true,
          title: 'Request Details'
        }}
      />
      <AgentStack.Screen 
        name="CreateOffer" 
        component={() => <PlaceholderScreen title="Create Offer" />}
        options={{ 
          headerShown: true,
          title: 'Create Offer'
        }}
      />
    </AgentStack.Navigator>
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
          if (route.name === 'Agents') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Requests') {
            iconName = focused ? 'list' : 'list-outline';
          }
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Agents" 
        component={() => <PlaceholderScreen title="Company Agents" />}
        options={{ title: 'My Agents' }}
      />
      <Tab.Screen 
        name="Requests" 
        component={() => <PlaceholderScreen title="Company Requests" />}
        options={{ title: 'Requests' }}
      />
    </Tab.Navigator>
  );
}

// Company drawer
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
      <Drawer.Screen 
        name="Home" 
        component={CompanyTabs} 
        options={{
          title: 'Find Me Hotels',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={() => <PlaceholderScreen title="Company Profile" />}
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

// Company Stack with nested screens
function CompanyStackNavigator() {
  return (
    <CompanyStack.Navigator>
      <CompanyStack.Screen 
        name="CompanyDrawer" 
        component={CompanyDrawer} 
        options={{ headerShown: false }}
      />
      <CompanyStack.Screen 
        name="AgentDetails" 
        component={() => <PlaceholderScreen title="Agent Details" />}
        options={{ 
          headerShown: true,
          title: 'Agent Details'
        }}
      />
      <CompanyStack.Screen 
        name="RequestDetails" 
        component={() => <PlaceholderScreen title="Request Details" />}
        options={{ 
          headerShown: true,
          title: 'Request Details'
        }}
      />
    </CompanyStack.Navigator>
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
          if (route.name === 'Users') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          }
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Users" 
        component={() => <PlaceholderScreen title="Admin Users" />}
        options={{ title: 'Users' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={() => <PlaceholderScreen title="Admin Analytics" />}
        options={{ title: 'Analytics' }}
      />
    </Tab.Navigator>
  );
}

// Admin drawer
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
      <Drawer.Screen 
        name="Home" 
        component={AdminTabs} 
        options={{
          title: 'Find Me Hotels',
          drawerIcon: ({ color }) => (
            <Icon name="home-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={() => <PlaceholderScreen title="Admin Profile" />}
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

// Admin Stack with nested screens
function AdminStackNavigator() {
  return (
    <AdminStack.Navigator>
      <AdminStack.Screen 
        name="AdminDrawer" 
        component={AdminDrawer} 
        options={{ headerShown: false }}
      />
      <AdminStack.Screen 
        name="UserDetails" 
        component={() => <PlaceholderScreen title="User Details" />}
        options={{ 
          headerShown: true,
          title: 'User Details'
        }}
      />
      <AdminStack.Screen 
        name="AnalyticsReport" 
        component={() => <PlaceholderScreen title="Analytics Report" />}
        options={{ 
          headerShown: true,
          title: 'Analytics Report'
        }}
      />
    </AdminStack.Navigator>
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
  
  //  header options with sign out button
  const getHeaderOptionsWithSignOut = (title) => ({
  title,
  headerRight: () => (
    <Button
      icon={{
        name: "exit-outline",
        type: "ionicon",
        size: 24,
        color: "#FF3B30"
      }}
      type="clear"
      onPress={async () => {
        try {
          await signOut(); // Use the signOut function from auth.js
        } catch (error) {
          console.error('Error signing out:', error.message);
        }
      }}
    />
  )
});

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
          // App screens
          <>
            {userType === 'client' ? (
              <Stack.Screen 
                name="ClientHome" 
                component={ClientStackNavigator}
                options={getHeaderOptionsWithSignOut("Trip's Room")}
              />
            ) : userType === 'agent' ? (
              <Stack.Screen 
                name="AgentHome" 
                component={AgentStackNavigator}
                options={getHeaderOptionsWithSignOut('Search Requests')}
              />
            ) : userType === 'company' ? (
              <Stack.Screen 
                name="CompanyHome" 
                component={CompanyStackNavigator}
                options={getHeaderOptionsWithSignOut('Company Dashboard')}
              />
            ) : userType === 'admin' ? (
              <Stack.Screen 
                name="AdminHome" 
                component={AdminStackNavigator}
                options={getHeaderOptionsWithSignOut('Admin Dashboard')}
              />
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}