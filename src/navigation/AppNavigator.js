import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import SignupScreen from '../screens/SignupScreen';
import supabase from '../config/supabase';
import { Icon, Button } from 'react-native-elements';
import SigninScreen from '../screens/SigninScreen';
import TravelRequestList from '../screens/TravelRequestList';
import { View, Text } from 'react-native';

// Create navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Simple placeholder screen for sign out functionality
function SignOutScreen() {
  useEffect(() => {
    const signOut = async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error signing out:', error.message);
      }
    };
    
    signOut();
    
    return () => {};
  }, []);
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Signing out...</Text>
    </View>
  );
}

// Client tabs
function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = focused ? 'list' : 'list-outline';
          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Requests" 
        component={TravelRequestList}
        options={{ title: 'My Requests' }}
      />
    </Tab.Navigator>
  );
}

// Agent tabs
function AgentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          return <Icon name={focused ? 'list' : 'list-outline'} type="ionicon" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Requests" 
        component={TravelRequestList}
        options={{ title: 'Available Requests' }}
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
        component={TravelRequestList} // Replace with your actual Profile component
        options={{
          title: 'My Profile',
          drawerIcon: ({ color }) => (
            <Icon name="person-outline" type="ionicon" size={22} color={color} />
          ),
        }}
      />
      {/* Add more drawer screens here as needed */}
      
      {/* Sign Out is always the last item */}
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
  
  // Agent header options with sign out button
  const getAgentHeaderOptions = (title) => ({
    headerShown: true,
    title: title,
    headerRight: () => (
      <Button
        icon={{
          name: "exit-outline",
          type: "ionicon",
          size: 20,
          color: "#FF3B30"
        }}
        title="Sign Out"
        type="clear"
        titleStyle={{ color: "#FF3B30", fontSize: 14 }}
        onPress={async () => {
          try {
            await supabase.auth.signOut();
          } catch (error) {
            console.error('Error signing out:', error.message);
          }
        }}
        containerStyle={{ marginRight: 10 }}
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
                component={ClientDrawer}
                options={{ headerShown: false }}
              />
            ) : (
              <Stack.Screen 
                name="AgentHome" 
                component={AgentTabs}
                options={getAgentHeaderOptions('Search Requests')}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}