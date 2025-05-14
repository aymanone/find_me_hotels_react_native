import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from 'react-native-elements';

// Import screens
import SigninScreen from '../screens/SigninScreen';
import SignupScreen from '../screens/SignupScreen';
import TravelRequestForm from '../screens/TravelRequestForm';
import TravelRequestList from '../screens/TravelRequestList';
import supabase from '../config/supabase';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'NewRequest') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'MyRequests') {
            iconName = focused ? 'list' : 'list-outline';
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
        name="MyRequests" 
        component={TravelRequestList}
        options={{ title: 'My Requests' }}
      />
    </Tab.Navigator>
  );
}

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
          // App screens
          <>
            {userType === 'client' ? (
              <Stack.Screen 
                name="ClientHome" 
                component={ClientTabs}
                options={{ headerShown: false }}
              />
            ) : (
              <Stack.Screen 
                name="AgentHome" 
                component={AgentTabs}
                options={{ headerShown: false }}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
