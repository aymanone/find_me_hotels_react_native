import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import {
  Text,
  Card,
  Divider,
  Button,
  Icon,
  Input,
  Switch
} from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { validEmail } from '../utils/validation';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, screenSize, responsive } from '../styles//theme';
import { useTranslation } from '../config/localization';

const CompanyAgentProfileScreen = ({ route, navigation }) => {
  const { t,language } = useTranslation();
  const { agentId } = route.params;
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAgent, setEditedAgent] = useState(null);
  const [countries, setCountries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isPermittedToWork, setIsPermittedToWork] = useState(true);
  const [stats, setStats] = useState({
    totalOffers: 0,
    acceptedOffers: 0,
    rejectedOffers: 0,
    pendingOffers: 0,
    viewedOffers: 0,
    notViewedOffers: 0
  });

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        // Check if user is a company
        const isCompany = await checkUserRole('company');
        if (!isCompany) {
          showAlert(t('CompanyAgentProfileScreen', 'accessDenied'), t('CompanyAgentProfileScreen', 'onlyCompaniesAccess'));
          navigation.navigate('Home');
          return;
        }

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          showAlert(t('CompanyAgentProfileScreen', 'error'), t('CompanyAgentProfileScreen', 'userNotFound'));
          await signOut(navigation);
          return;
        }
        
        // Check if user is permitted to work
        if (user?.app_metadata?.permitted_to_work === false) {
          setIsPermittedToWork(false);
        }

        // Fetch agent details
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select(`
            *,
            countries (
              id,
              country_name
            )
          `)
          .eq('id', agentId)
          .single();

        if (agentError) throw agentError;

        // Make sure this agent belongs to the current company
        if (agentData.company_id !== user.id) {
          showAlert(t('CompanyAgentProfileScreen', 'accessDenied'), t('CompanyAgentProfileScreen', 'onlyOwnAgents'));
          navigation.navigate('CompanyAgentsList');
          return;
        }

        setAgent(agentData);
        setEditedAgent({
          first_name: agentData.first_name,
          second_name: agentData.second_name,
          country_id: agentData.agent_country,
          permitted_to_work: agentData.permitted_to_work !== false,
          // Include email if agent hasn't signed up yet
          ...(agentData.user_id ? {} : { agent_email: agentData.agent_email })
        });

        // Fetch all countries for dropdown
        const { data: countriesData, error: countriesError } = await supabase
          .from('countries')
          .select('id, country_name')
          .order('country_name');

        if (countriesError) throw countriesError;
        setCountries(countriesData);
      
        // Fetch agent statistics
        if (agentData.user_id) {
          const { data: offersData, error: offersError } = await supabase
            .rpc('get_agent_offers_summary', { company: user.id, agent: agentData.id });

          if (offersError) throw offersError;

          // Calculate statistics
          const totalOffers = offersData[0].total_offers || 0;
          const acceptedOffers = offersData[0].accepted_offers || 0;
          const rejectedOffers = offersData[0].rejected_offers || 0;
          const viewedOffers = offersData[0].viewed_offers || 0;
          const notViewedOffers = offersData[0].not_viewed_offers || 0;

          setStats({
            totalOffers,
            acceptedOffers,
            rejectedOffers,
            viewedOffers,
            notViewedOffers
          });
        }else{
          // If agent hasn't signed up yet, set all stats to 0
          setStats({
            totalOffers: 0,
            acceptedOffers: 0,
            rejectedOffers: 0,
            viewedOffers: 0,
            notViewedOffers: 0
          });
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
           showAlert(
      t('CompanyAgentProfileScreen', 'error'), 
      t('CompanyAgentProfileScreen', 'loadProfileError'),
      [
        { text: t('CompanyAgentProfileScreen', 'tryAgain'), onPress: () => {
            setTimeout(() => fetchAgentData(), 100);
} },
        { text: t('CompanyAgentProfileScreen', 'cancel'), style: 'cancel' }
      ]
    );
    return;
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId, navigation]);

  const handleEditButtonPress = async () => {
    try {
      // Get current user to check latest permission status
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('CompanyAgentProfileScreen', 'error'), t('CompanyAgentProfileScreen', 'userNotFound'));
        await signOut(navigation);
        return;
      }
      
      // Check if user is permitted to work before allowing edit
      if (user?.app_metadata?.permitted_to_work === false) {
        setIsPermittedToWork(false); // Update the state to reflect current permission
        showAlert(
          t('CompanyAgentProfileScreen', 'permissionDenied'),
          t('CompanyAgentProfileScreen', 'accountInactive')
        );
        return;
      }
      
      // If we're canceling edit mode, reset the form
      if (isEditing) {
        // Reset edited agent to original values
        setEditedAgent({
          first_name: agent.first_name,
          second_name: agent.second_name,
          country_id: agent.agent_country,
          permitted_to_work: agent.permitted_to_work !== false,
          // Include email if agent hasn't signed up yet
          ...(agent.user_id ? {} : { agent_email: agent.agent_email })
        });
      }
      setIsEditing(!isEditing);
    } catch (error) {
      console.error('Error checking permissions:', error);
      showAlert(t('CompanyAgentProfileScreen', 'error'), t('CompanyAgentProfileScreen', 'permissionCheckError'));
    }
  };

  const handleSaveChanges = async () => {
    try {
      // Check again if user is permitted to work before saving changes
      if (!isPermittedToWork) {
        showAlert(
          t('CompanyAgentProfileScreen', 'permissionDenied'),
          t('CompanyAgentProfileScreen', 'cannotUpdateProfiles')
        );
        return;
      }
      
      setSaving(true);
      
      // Validate inputs
      if (!editedAgent.first_name.trim() || !editedAgent.second_name.trim()) {
        showAlert(t('CompanyAgentProfileScreen', 'validationError'), t('CompanyAgentProfileScreen', 'nameRequired'));
        setSaving(false);
        return;
      }

      // Validate email if agent hasn't signed up yet
      if (!agent.user_id) {
        if (!editedAgent.agent_email || !validEmail(editedAgent.agent_email)) {
          showAlert(t('CompanyAgentProfileScreen', 'validationError'), t('CompanyAgentProfileScreen', 'validEmailRequired'));
          setSaving(false);
          return;
        }
      }

      // Get current user again to ensure we have the latest data
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('CompanyAgentProfileScreen', 'error'), t('CompanyAgentProfileScreen', 'userNotFound'));
        await signOut(navigation);
        return;
      }

      // Prepare update data
      const updateData = {
        first_name: editedAgent.first_name,
        second_name: editedAgent.second_name,
        agent_country: editedAgent.country_id,
        permitted_to_work: editedAgent.permitted_to_work
      };

      // Include email update only if agent hasn't signed up yet
      if (!agent.user_id) {
        updateData.agent_email = editedAgent.agent_email;
      }

      // Update agent in database
      const { error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', agentId);

      if (error) throw error;

      // Update local state
      setAgent({
        ...agent,
        first_name: editedAgent.first_name,
        second_name: editedAgent.second_name,
        agent_country: editedAgent.country_id,
        permitted_to_work: editedAgent.permitted_to_work,
        ...(agent.user_id ? {} : { agent_email: editedAgent.agent_email }),
        countries: countries.find(c => c.id === editedAgent.country_id)
      });

      setIsEditing(false);
      showAlert(t('CompanyAgentProfileScreen', 'success'), t('CompanyAgentProfileScreen', 'agentUpdatedSuccess'));
    } catch (error) {
      console.error('Error updating agent:', error);
      showAlert(t('CompanyAgentProfileScreen', 'error'), t('CompanyAgentProfileScreen', 'updateProfileError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!agent) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('CompanyAgentProfileScreen', 'agentNotFound')}</Text>
        <Button
          title={t('CompanyAgentProfileScreen', 'goBack')}
          onPress={() => navigation.goBack()}
          buttonStyle={styles.backButton}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {!isPermittedToWork && (
        <Card containerStyle={styles.warningCard}>
          <View style={styles.warningContainer}>
            <Icon name="alert-circle-outline" type="ionicon"  color={theme.colors.warningIcon} size={theme.responsiveComponents.icon.large}  />
            <Text style={styles.warningText}>
              {t('CompanyAgentProfileScreen', 'accountInactiveWarning')}
            </Text>
          </View>
        </Card>
      )}
      
      <Card containerStyle={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Icon
            name="person-circle-outline"
            type="ionicon"
            size={responsive(70, 80, 80, 80, 80)}
            color={theme.colors.primary}
          />
          <Text style={styles.agentName}>
            {agent.first_name} {agent.second_name}
          </Text>
          
          <Button
            icon={<Icon name={isEditing ? "close" : "edit"} type="material"  size={theme.responsiveComponents.icon.medium} color={theme.colors.textWhite} />}
            title={isEditing ? t('CompanyAgentProfileScreen', 'cancel') : t('CompanyAgentProfileScreen', 'editProfile')}
            onPress={handleEditButtonPress}
            buttonStyle={[
              styles.editButton, 
              isEditing && { backgroundColor: theme.colors.error },
              !isPermittedToWork && { backgroundColor: theme.colors.outdated }
            ]}
            containerStyle={styles.editButtonContainer}
            disabled={!isPermittedToWork}
          />
        </View>

        <Divider style={styles.divider} />

        <View style={styles.infoSection}>
          {isEditing ? (
            <>
              <View style={styles.editRow}>
                <Text style={styles.infoLabel}>{t('CompanyAgentProfileScreen', 'firstName')}</Text>
                <Input
                  value={editedAgent.first_name}
                  onChangeText={(text) => setEditedAgent({...editedAgent, first_name: text})}
                  containerStyle={styles.editInput}
                  inputStyle={styles.editInputText}
                />
              </View>

              <View style={styles.editRow}>
                <Text style={styles.infoLabel}>{t('CompanyAgentProfileScreen', 'lastName')}</Text>
                <Input
                  value={editedAgent.second_name}
                  onChangeText={(text) => setEditedAgent({...editedAgent, second_name: text})}
                  containerStyle={styles.editInput}
                  inputStyle={styles.editInputText}
                />
              </View>

              {!agent.user_id && (
                <View style={styles.editRow}>
                  <Text style={styles.infoLabel}>{t('CompanyAgentProfileScreen', 'email')}</Text>
                  <Input
                    value={editedAgent.agent_email}
                    onChangeText={(text) => setEditedAgent({...editedAgent, agent_email: text})}
                    containerStyle={styles.editInput}
                    inputStyle={styles.editInputText}
                  />
                </View>
              )}

              <View style={styles.editRow}>
                <Text style={styles.infoLabel}>{t('CompanyAgentProfileScreen', 'country')}</Text>
                <View style={styles.dropdownContainer}>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    inputSearchStyle={styles.inputSearchStyle}
                    iconStyle={styles.iconStyle}
                    data={countries.map(country => ({
                      label: country.country_name,
                      value: country.id
                    }))}
                    search
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder={t('CompanyAgentProfileScreen', 'selectCountry')}
                    searchPlaceholder={t('CompanyAgentProfileScreen', 'searchPlaceholder')}
                    value={editedAgent.country_id}
                    onChange={item => {
                      setEditedAgent({...editedAgent, country_id: item.value});
                    }}
                    renderItem={item => (
                      <View style={styles.dropdownItem}>
                        <Text style={styles.textItem}>{item.label}</Text>
                      </View>
                    )}
                  />
                </View>
              </View>

              <View style={styles.editRow}>
                <Text style={styles.infoLabel}>{t('CompanyAgentProfileScreen', 'status')}</Text>
                <View style={styles.switchContainer}>
                  <Text style={[styles.switchLabel, !editedAgent.permitted_to_work && styles.inactiveText]}>
                    {editedAgent.permitted_to_work ? t('CompanyAgentProfileScreen', 'active') : t('CompanyAgentProfileScreen', 'inactive')}
                  </Text>
                  <Switch
                    value={editedAgent.permitted_to_work}
                    onValueChange={(value) => setEditedAgent({...editedAgent, permitted_to_work: value})}
                    trackColor={{ false: theme.colors.error, true: theme.colors.success }}
                    thumbColor={editedAgent.permitted_to_work ? theme.colors.accent : theme.colors.disabled}
                  />
                </View>
              </View>

              <Button
                title={t('CompanyAgentProfileScreen', 'saveChanges')}
                onPress={handleSaveChanges}
                buttonStyle={styles.saveButton}
                loading={saving}
                disabled={saving}
              />
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('CompanyAgentProfileScreen', 'email')}</Text>
                <Text style={styles.infoValue}>{agent.agent_email || t('CompanyAgentProfileScreen', 'notProvided')}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('CompanyAgentProfileScreen', 'country')}</Text>
                <Text style={styles.infoValue}>{agent.countries?.country_name || t('CompanyAgentProfileScreen', 'notSpecified')}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('CompanyAgentProfileScreen', 'status')}</Text>
                <Text style={[
                  styles.infoValue,
                  { color: agent?.permitted_to_work ? theme.colors.success : theme.colors.error }
                ]}>
                  {agent?.permitted_to_work ? t('CompanyAgentProfileScreen', 'active') : t('CompanyAgentProfileScreen', 'inactive')}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('CompanyAgentProfileScreen', 'joined')}</Text>
                <Text style={styles.infoValue}>
                  {new Date(agent.created_at).toLocaleDateString()}
                </Text>
              </View>
            </>
          )}
        </View>
      </Card>

      <Card containerStyle={styles.statsCard}>
        <Text style={styles.cardTitle}>{t('CompanyAgentProfileScreen', 'performanceStatistics')}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalOffers}</Text>
            <Text style={styles.statLabel}>{t('CompanyAgentProfileScreen', 'totalOffers')}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>{stats.acceptedOffers}</Text>
            <Text style={styles.statLabel}>{t('CompanyAgentProfileScreen', 'accepted')}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.error }]}>{stats.rejectedOffers}</Text>
            <Text style={styles.statLabel}>{t('CompanyAgentProfileScreen', 'rejected')}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.info }]}>{stats.viewedOffers}</Text>
            <Text style={styles.statLabel}>{t('CompanyAgentProfileScreen', 'viewed')}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>{stats.notViewedOffers}</Text>
            <Text style={styles.statLabel}>{t('CompanyAgentProfileScreen', 'notViewed')}</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.responsiveTypography.fontSize.lg,
    marginBottom: theme.spacing.xl,
    color: theme.colors.error,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
  },
  warningCard: {
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.warningLight,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.warningTitle,
  },
  profileCard: {
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  agentName: {
    fontSize: theme.responsiveTypography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    width: responsive(130, 150, 150, 150, 150),
    height: responsive(36, 40, 40, 40, 40),
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  editButtonContainer: {
    marginTop: theme.spacing.sm,
  },
  divider: {
    marginVertical: theme.spacing.sm,
  },
  infoSection: {
    marginHorizontal: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  editRow: {
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.responsiveTypography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  infoValue: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.text,
  },
  editInput: {
    width: '100%',
  },
  editInputText: {
    fontSize: theme.responsiveTypography.fontSize.md,
  },
  dropdownContainer: {
    width: '100%',
    marginVertical: theme.spacing.xs,
  },
  dropdown: {
    height: theme.responsiveComponents.input.height,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundWhite,
  },
  placeholderStyle: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textLight,
  },
  selectedTextStyle: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.text,
  },
  inputSearchStyle: {
    height: responsive(36, 40, 40, 40, 40),
    fontSize: theme.responsiveTypography.fontSize.md,
  },
  iconStyle: {
    width: theme.responsiveComponents.icon.medium,
    height: theme.responsiveComponents.icon.medium,
  },
  dropdownItem: {
    padding: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textItem: {
    flex: 1,
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.text,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: theme.responsiveTypography.fontSize.md,
    marginRight: theme.spacing.sm,
    color: theme.colors.text,
  },
  inactiveText: {
    color: theme.colors.error,
  },
  saveButton: {
    backgroundColor: theme.colors.success,
    width: '100%',
    height: responsive(36, 40, 40, 40, 40),
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  statsCard: {
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: theme.responsiveTypography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginHorizontal: -responsive(4, 8, 8, 8, 8), //
  },
  statItem: {
   alignItems: 'center',
  minWidth: responsive(80, 100, 100, 100, 100),
  marginHorizontal: responsive(4, 8, 8, 8, 8),
  marginVertical: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.responsiveTypography.statValue.fontSize,
    fontWeight: theme.responsiveTypography.statValue.fontWeight,
    color: theme.responsiveTypography.statValue.color,
  },
  statLabel: {
    fontSize: theme.responsiveTypography.statLabel.fontSize,
    color: theme.responsiveTypography.statLabel.color,
  },
});
export default CompanyAgentProfileScreen;
