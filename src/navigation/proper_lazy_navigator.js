import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { AppState, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Icon, Button } from 'react-native-elements';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../config/supabase';
import { signOut } from '../utils/auth';

// Create navigators ONCE outside component
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Loading component for lazy loaded screens
const LoadingScreen = React.memo(() => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={{ marginTop: 10 }}>Loading...</Text>
  </View>
));

// Create a lazy wrapper component
const LazyScreen = React.memo(({ importFunc }) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={<LoadingScreen />}>
      <LazyComponent {...props} />
    </Suspense>
  );
});

// SignOut component (not lazy since it's small)
const SignOutScreen = React.memo(function SignOutScreen({ navigation }) {
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

// Tab screen options
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
      'My Companies': focused ? 'analytics' : 'analytics-outline',
    };
    
    const iconName = iconMap[route.name] || 'help-outline';
    return <Icon name={iconName} type="ionicon" size={size} color={color} />;
  },
  headerShown: false,
});

// Tab listeners
const createTabListeners = () => (navigation) => ({
  tabPress: (e) => {
    const targetRouteName = e.target.split('-')[0];
    navigation.reset({
      index: 0,
      routes: [{ name: targetRouteName }],
    });
  },
});

// Drawer screen options
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

// CLIENT NAVIGATION - Only loads client screens
const ClientStack = React.memo(function ClientStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen 
        name="ClientTravelRequestDetails" 
        component={LazyScreen({ importFunc: () => import('../screens/ClientTravelRequestDetailsScreen') })}
      />
      <Stack.Screen 
        name="ClientOfferDetails" 
        component={LazyScreen({ importFunc: () => import('../screens/ClientOfferDetailsScreen') })}
      />
      <Stack.Screen 
        name="ClientUpdatedRequests" 
        component={LazyScreen({ importFunc: () => import('../screens/ClientUpdatedRequestsScreen') })}
      />
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
        component={LazyScreen({ importFunc: () => import('../screens/TravelRequestForm') })}
        options={{ title: 'New Request' }}
      />
      <Tab.Screen 
        name="Requests" 
        component={LazyScreen({ importFunc: () => import('../screens/ClientTravelRequestListScreen') })}
        options={{ title: 'My Requests' }}
      />
    </Tab.Navigator>
  );
});

const ClientDrawer = React.memo(function ClientDrawer() {
  const screenOptions = useMemo(() => createDrawerScreenOptions(), []);
  
  // Lazy load badge components
  const ClientNewOffersBadge = lazy(() => import('../components/ClientNewOffersBadge'));
  
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
            e.preventDefault();
            
            setTimeout(() => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Home',
                      state: {
                        index: 0,
                        routes: [{ name: 'ClientTabs' }]
                      }
                    }
                  ]
                })
              );
            }, 100);
            
            navigation.closeDrawer();
          },
        })}
      />
      <Drawer.Screen 
        name="ClientUpdatedRequestsDrawer"
        component={LazyScreen({ importFunc: () => import('../screens/ClientUpdatedRequestsScreen') })}
        options={{
          title: 'Updated Requests',
          drawerIcon: ({ color }) => (
            <View style={{ position: 'relative' }}>
              <Icon name="refresh-outline" type="ionicon" size={22} color={color} />
              <Suspense fallback={null}>
                <ClientNewOffersBadge />
              </Suspense>
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          drawerItemPress: (e) => {
            e.preventDefault();
            navigation.navigate('Home', {
              screen: 'ClientUpdatedRequests'
            });
          },
        })}
      />
      <Drawer.Screen 
        name="Profile" 
        component={LazyScreen({ importFunc: () => import('../screens/ClientClientProfileScreen') })}
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
});

// AGENT NAVIGATION - Only loads when user is agent
const AgentNavigator = React.memo(function AgentNavigator() {
  const AgentStack = React.memo(function AgentStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AgentTabs" component={AgentTabs} />
        <Stack.Screen 
          name="AgentUpdatedRequests" 
          component={LazyScreen({ importFunc: () => import('../screens/AgentUpdatedRequestsScreen') })}
        />
        <Stack.Screen 
          name="AgentTravelRequestDetails" 
          component={LazyScreen({ importFunc: () => import('../screens/AgentTravelRequestDetailsScreen') })}
        />
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
          component={LazyScreen({ importFunc: () => import('../screens/AgentSearchTravelRequestsScreen') })}
          options={{ title: 'Search Requests' }}
        />
        <Tab.Screen 
          name="MyOffers" 
          component={LazyScreen({ importFunc: () => import('../screens/AgentAgentOffersScreen') })}
          options={{ title: 'My Offers' }}
        />
      </Tab.Navigator>
    );
  });

  const AgentDrawer = React.memo(function AgentDrawer() {
    const screenOptions = useMemo(() => createDrawerScreenOptions(), []);
    const UpdatedRequestsBadge = lazy(() => import('../components/UpdatedRequestsBadge'));
    
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
              e.preventDefault();
              
              setTimeout(() => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      {
                        name: 'Home',
                        state: {
                          index: 0,
                          routes: [{ name: 'AgentTabs' }]
                        }
                      }
                    ]
                  })
                );
              }, 100);
              
              navigation.closeDrawer();
            },
          })}
        />
        
        <Drawer.Screen 
          name="AgentUpdatedRequestsDrawer"
          component={LazyScreen({ importFunc: () => import('../screens/AgentUpdatedRequestsScreen') })}
          options={{
            title: 'Updated Requests',
            drawerIcon: ({ color }) => (
              <View style={{ position: 'relative' }}>
                <Icon name="refresh-outline" type="ionicon" size={22} color={color} />
                <Suspense fallback={null}>
                  <UpdatedRequestsBadge />
                </Suspense>
              </View>
            ),
          }}
          listeners={({ navigation }) => ({
            drawerItemPress: (e) => {
              e.preventDefault();
              navigation.navigate('Home', {
                screen: 'AgentUpdatedRequests'
              });
            },
          })}
        />
        
        <Drawer.Screen 
          name="Profile" 
          component={LazyScreen({ importFunc: () => import('../screens/AgentAgentProfileScreen') })}
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
  });

  return <AgentDrawer />;
});

// COMPANY NAVIGATION - Only loads when user is company
const CompanyNavigator = React.memo(function CompanyNavigator() {
  const CompanyStack = React.memo(function CompanyStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CompanyTabs" component={CompanyTabs} />
        <Stack.Screen 
          name="CompanyAgentProfile" 
          component={LazyScreen({ importFunc: () => import('../screens/CompanyAgentProfileScreen') })}
        />
      </Stack.Navigator>
    );
  });

  const CompanyTabs = React.memo(function CompanyTabs() {
    const screenOptions = useMemo(() => createTabScreenOptions(), []);
    
    return (
      <Tab.Navigator screenOptions={({ route }) => screenOptions(route)}>
        <Tab.Screen 
          name="Create Agent"
          component={LazyScreen({ importFunc: () => import('../screens/CompanyCreateAgentFormScreen') })}
          options={{ title: 'Create Agent', headerShown: false }}
        />
        <Tab.Screen 
          name="Agents" 
          component={LazyScreen({ importFunc: () => import('../screens/CompanyAgentsListScreen') })}
          options={{ title: 'My Agents', headerShown: false }}
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
          component={CompanyStack} 
          options={{
            title: 'Company Dashboard',
            drawerIcon: ({ color }) => (
              <Icon name="home-outline" type="ionicon" size={22} color={color} />
            ),
          }}
          listeners={({ navigation }) => ({
            drawerItemPress: (e) => {
              e.preventDefault();
              
              setTimeout(() => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      {
                        name: 'Home',
                        state: {
                          index: 0,
                          routes: [{ name: 'CompanyTabs' }]
                        }
                      }
                    ]
                  })
                );
              }, 100);
              
              navigation.closeDrawer();
            },
          })}
        />
        
        <Drawer.Screen 
          name="Profile" 
          component={LazyScreen({ importFunc: () => import('../screens/CompanyCompanyProfileScreen') })}
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
  });

  return <CompanyDrawer />;
});

// ADMIN NAVIGATION - Only loads when user is admin
const AdminNavigator = React.memo(function AdminNavigator() {
  const AdminStack = React.memo(function AdminStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
        <Stack.Screen 
          name="AdminCompanyProfile" 
          component={LazyScreen({ importFunc: () => import('../screens/AdminCompanyProfileScreen') })}
        />
      </Stack.Navigator>
    );
  });

  const AdminTabs = React.memo(function AdminTabs() {
    const screenOptions = useMemo(() => createTabScreenOptions(), []);
    
    return (
      <Tab.Navigator screenOptions={({ route }) => screenOptions(route)}>
        <Tab.Screen 
          name="Create Company"
          component={LazyScreen({ importFunc: () => import('../screens/AdminCreateCompanyFormScreen') })} 
          options={{ title: 'Create Company', headerShown: false }}
        />
        <Tab.Screen 
          name="My Companies" 
          component={LazyScreen({ importFunc: () => import('../screens/AdminCompaniesListScreen') })}
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
          component={AdminStack} 
          options={{
            title: 'Admin Dashboard',
            drawerIcon: ({ color }) => (
              <Icon name="home-outline" type="ionicon" size={22} color={color} />
            ),
          }}
          listeners={({ navigation }) => ({
            drawerItemPress: (e) => {
              e.preventDefault();
              
              setTimeout(() => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      {
                        name: 'Home',
                        state: {
                          index: 0,
                          routes: [{ name: 'AdminTabs' }]
                        }
                      }
                    ]
                  ])
                );
              }, 100);
              
              navigation.closeDrawer();
            },
          })}
        />
        
        <Drawer.Screen 
          name="Profile" 
          component={LazyScreen({ importFunc: () => import('../screens/AdminAdminProfileScreen') })}
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
  });

  return <AdminDrawer />;
});

// Main App Navigator
export default function AppNavigator({navigationRef}) {
  const [session, setSession] = useState(null);
  const [userType, setUserType] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const channelsRef = useRef([]);
  const { isResettingPassword } = useAuth();

  // Linking configuration (same as your original)
  const linking = {
    prefixes: ['findmehotels://', 'https://findmehotels.com', 'http://findmehotels.com','exp://192.168.1.109:8081/--/', 'exp://','http://localhost:8081',
    'http://localhost:8081/','https://tiny-crepe-b758ab.netlify.app'] ,
    config: {
      screens: {
        Signin: 'signin',
        Signup: 'signup',
        ForgotPassword: 'forgot-password',
        ResetPassword: 'reset-password',
        
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
                ClientTravelRequestDetails: 'client/request/:id?',
                ClientOfferDetails: 'client/offer/:offerId?',
                ClientUpdatedRequests: 'client/updated-requests'
              }
            },
            Profile: 'client/profile'
          }
        },
        
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
                AgentTravelRequestDetails: 'agent/request/:requestId?',
                AgentUpdatedRequests: 'agent/updated-requests'
              }
            },
            Profile: 'agent/profile'
          }
        },
        
        CompanyApp: {
          screens: {
            Home: { 
              screens:{
                CompanyTabs:{
                  screens: {
                    'Create Agent': 'company/create-agent',
                    'Agents': 'company/agents'
                  }
                },
                CompanyAgentProfile: 'company/agent/:agentId?'
              }
            },
            Profile: 'company/profile',
          }
        },
        
        AdminApp: {
          screens: {
            Home: {
              screens:{
                AdminTabs:{
                  screens: {
                    'Create Company': 'admin/create-company',
                    'My Companies': 'admin/companies'
                  } 
                },
                AdminCompanyProfile: 'admin/company/:companyId?'
              }
            },
            Profile: 'admin/profile',
          }
        }
      }
    },
  };

  // Your original setupUserChannels and other logic...
  const setupUserChannels = (role, userId) => {
    if (channelsRef.current.length > 0) {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    }

    const handleSignOut = async () => {
      try {
        await signOut(null, 'Signin');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    };
      
    switch (role) {
      case 'client':
        // setupClientChannels(userId, handleSignOut);
        break;
      case 'agent':
        // setupAgentChannels(userId, handleSignOut);
        break;
      case 'company':
        // setupCompanyChannels(userId, handleSignOut);
        break;
      case 'admin':
        // setupAdminChannels(userId, handleSignOut);
        break;
      default:
        console.log('Unknown user role:', role);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/active/) && nextAppState.match(/inactive|background/)) {
        console.log('App going to background - removing all channels');
        supabase.removeAllChannels();
      }
      else if (appState.match(/inactive|background/) && nextAppState === 'active') {
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
// In your AppNavigator, add this useEffect
useEffect(() => {
  if (userType && navigationRef.current) {
    // Reset navigation when user type changes
    navigationRef.current.reset({
      index: 0,
      routes: [{ name: `${userType.charAt(0).toUpperCase() + userType.slice(1)}App` }],
    });
  }
}, [userType]);
  // Auth screens (lazy loaded)
  const authScreens = useMemo(() => (
    <>
      <Stack.Screen 
        name="Signin" 
        component={LazyScreen({ importFunc: () => import('../screens/SigninScreen') })}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Signup" 
        component={LazyScreen({ importFunc: () => import('../screens/SignupScreen') })}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={LazyScreen({ importFunc: () => import('../screens/ForgotPasswordScreen') })}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ResetPassword" 
        component={LazyScreen({ importFunc: () => import('../screens/ResetPasswordScreen') })}
        options={{ headerShown: false }}
      />
    </>
  ), []);

  // App screens - Only loads the navigation for current user type
  const appScreens = useMemo(() => {
    if (!userType) return null;
    
    const navigatorConfigs = {
      client: { name: 'ClientApp', component: ClientDrawer },
      agent: { name: 'AgentApp', component: AgentNavigator },
      company: { name: 'CompanyApp', component: CompanyNavigator },
      admin: { name: 'AdminApp', component: AdminNavigator },
    };
    
    const config = navigatorConfigs[userType];
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
        {!session || isResettingPassword ? authScreens : appScreens}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
