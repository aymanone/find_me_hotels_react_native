import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions ,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  SearchBar,
  Icon
} from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser } from '../utils/auth';
import { showAlert } from "../components/ShowAlert";
import { theme, commonStyles, screenSize, responsive,breakpoints } from '../styles//theme';
import { useTranslation } from '../config/localization';

const CompanyAgentsListScreen = ({ navigation }) => {
  const { t, language } = useTranslation();
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const fetchAgents = async () => {
    try {
      setRefreshing(true);
      
      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        showAlert(t('CompanyAgentsListScreen', 'error'), t('CompanyAgentsListScreen', 'userNotFound'));
        navigation.navigate('Signin');
        return;
      }
      
      // Fetch agents for this company
      const { data, error } = await supabase
        .from('agents')
        .select(`
          id,
          first_name,
          second_name,
          agent_country,
          countries (
            country_name
          )
        `)
        .eq('company_id', currentUser.id);

      if (error) throw error;
      
      setAgents(data);
      setFilteredAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
      showAlert(t('CompanyAgentsListScreen', 'error'), t('CompanyAgentsListScreen', 'failedToLoadAgentsList'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const checkUserAndFetchAgents = async () => {
      try {
        // Check if user is a company
        const userRole = await checkUserRole('company');
        if (!userRole) {
          showAlert(t('CompanyAgentsListScreen', 'accessDenied'), t('CompanyAgentsListScreen', 'onlyCompaniesAccess'));
          navigation.navigate('Home');
          return;
        }

        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          showAlert(t('CompanyAgentsListScreen', 'error'), t('CompanyAgentsListScreen', 'userNotFound'));
          navigation.navigate('Login');
          return;
        }
        
        setUser(currentUser);

        // Fetch agents
        await fetchAgents();
      } catch (error) {
        console.error('Error fetching agents:', error);
        showAlert(t('CompanyAgentsListScreen', 'error'), t('CompanyAgentsListScreen', 'failedToLoadAgentsList'));
        setLoading(false);
      }
    };

    checkUserAndFetchAgents();
  }, [navigation]);
  // Handle window resize for responsive grid
useEffect(() => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    setWindowDimensions(window);
  });

  return () => subscription?.remove();
}, []);

// Helper to calculate grid item width dynamically
const getGridItemWidth = () => {
  const width = windowDimensions.width;
   if (width < breakpoints.md) {
    return 1; // Mobile: 1 column (< 414px)
  } else if (width < breakpoints.xl) {
    return 2; // Tablet: 2 columns (414px - 1024px)
  } else {
    return 3; // Desktop: 3 columns (> 1024px)
  }
 
};

  const updateSearch = (text) => {
    setSearch(text);
    
    if (text.trim() === '') {
      setFilteredAgents(agents);
      return;
    }
    
    const filtered = agents.filter(agent => {
      const fullName = `${agent.first_name} ${agent.second_name}`.toLowerCase();
      const searchTerm = text.toLowerCase();
      
      return agent.first_name.toLowerCase().includes(searchTerm) || 
             agent.second_name.toLowerCase().includes(searchTerm) ||
             fullName.includes(searchTerm);
    });
    
    setFilteredAgents(filtered);
  };

  const handleDeleteAgent = async (agentId, agentName) => {
    try {
      // Confirm deletion
      showAlert(
        t('CompanyAgentsListScreen', 'confirmDeletion'),
        t('CompanyAgentsListScreen', 'deleteAgentConfirm', { agentName }),
        [
          {
            text: t('CompanyAgentsListScreen', 'cancel'),
            style: 'cancel'
          },
          {
            text: t('CompanyAgentsListScreen', 'delete'),
            onPress: async () => {
              // Get current user again to check permissions
              const currentUser = await getCurrentUser();
              
              if (!currentUser) {
                showAlert(t('CompanyAgentsListScreen', 'error'), t('CompanyAgentsListScreen', 'userNotFound'));
                return;
              }
              
              // Check if user is permitted to work
              if (currentUser.app_metadata?.permitted_to_work !== true) {
                showAlert(t('CompanyAgentsListScreen', 'permissionDenied'), t('CompanyAgentsListScreen', 'permissionDenied'));
                return;
              }
              
              // Delete the agent
              const { error } = await supabase
                .from('agents')
                .delete()
                .eq('id', agentId);
              
              if (error) throw error;
              
              // Update the agents list
              setAgents(agents.filter(agent => agent.id !== agentId));
              setFilteredAgents(filteredAgents.filter(agent => agent.id !== agentId));
              
              showAlert(t('CompanyAgentsListScreen', 'success'), t('CompanyAgentsListScreen', 'agentDeleted'));
            },
            style: 'destructive'
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting agent:', error);
      showAlert(t('CompanyAgentsListScreen', 'error'), t('CompanyAgentsListScreen', 'failedToDeleteAgent'));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text h4 style={styles.headerTitle}>{t('CompanyAgentsListScreen', 'yourAgents')}</Text>
        <Button
         title={t('CompanyAgentsListScreen', 'refreshAgents')}
          type="clear"
          loading={refreshing}
          onPress={fetchAgents}
          buttonStyle={styles.refreshButton}
        />
      </View>
      
      <SearchBar
        placeholder={t('CompanyAgentsListScreen', 'searchAgentsPlaceholder')}
        onChangeText={updateSearch}
        value={search}
        containerStyle={styles.searchBarContainer}
        inputContainerStyle={styles.searchBarInputContainer}
        lightTheme
        round
      />
      
      <ScrollView style={styles.scrollView}>
        {filteredAgents.length === 0 ? (
          <Card containerStyle={styles.noAgentsCard}>
            <Text style={styles.noAgentsText}>{t('CompanyAgentsListScreen', 'noAgents')}</Text>
          </Card>
        ) : (
          <View style={commonStyles.offerGridContainer}>
          {filteredAgents.map(agent => (
             <View 
                key={agent.id}
                style={[
                  commonStyles.offerGridItem,
                  { width: getGridItemWidth() }
                ]}
              >
            <Card key={agent.id} containerStyle={styles.agentCard}>
              <View style={styles.agentHeader}>
                
                <Text style={styles.agentName}>
                  {agent.first_name} {agent.second_name}
                </Text>
               
              </View>
              
              <Text style={styles.agentCountry}>
                {t('CompanyAgentsListScreen', 'country')}: {agent.countries?.country_name || t('CompanyAgentsListScreen', 'notSpecified')}
              </Text>
              
              <View style={styles.actionButtons}>
                <Button
                  title={t('CompanyAgentsListScreen', 'viewProfile')}
                  type="outline"
                  buttonStyle={styles.viewButton}
                  onPress={() => navigation.navigate("Home",{screen: "CompanyAgentProfile",params:
                    { agentId: agent.id }})}
                />
                
                <Button
                  icon={ <Icon name="trash-outline" type="ionicon" color={theme.colors.textWhite} size={theme.spacing.xl} />}
                  buttonStyle={styles.deleteButton}
                  onPress={() => handleDeleteAgent(agent.id, `${agent.first_name} ${agent.second_name}`)}
                />
              </View>
            </Card>
            </View>
          ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.typography.h3.color,
  },
  refreshButton: {
    padding: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  searchBarContainer: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  searchBarInputContainer: {
    backgroundColor: theme.colors.backgroundGray,
  },
  scrollView: {
    flex: 1,
  },
  agentCard: {
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundWhite,
    ...theme.shadows.card,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  agentName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  agentId: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  agentCountry: {
    fontSize: theme.typography.fontSize.md,
    marginBottom: theme.spacing.lg,
    color: theme.colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  viewButton: {
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xl,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xl,
  },
  noAgentsCard: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundWhite,
    ...theme.shadows.card,
  },
  noAgentsText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
export default CompanyAgentsListScreen;
