import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Divider, 
  Icon, 
  Input,
  Overlay,
  Switch
} from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { validUrl, validEmail, validPhoneNumber } from '../utils/validation';
import { showAlert } from "../components/ShowAlert";
import {  useTranslation } from '../config/localization';

export default function AdminCompanyProfileScreen({ route, navigation }) {
  const { t,language } = useTranslation();
  const { companyId } = route.params;
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [countries, setCountries] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [countryId, setCountryId] = useState(null);
  const [permittedToWork, setPermittedToWork] = useState(true);
  const [licenseNum, setLicenseNum] = useState('');
  // Validation errors
  const [urlError, setUrlError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [licenseError, setLicenseError] = useState('');
  // Agent summary stats
  const [agentsSummary, setAgentsSummary] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalAgents: 0,
    notViewedOffers: 0,
    viewedOffers: 0,
    rejectedOffers: 0,
    acceptedOffers: 0
  });

  useEffect(() => {
    const checkPermissionAndFetchData = async () => {
      try {
        // Check if user is admin
        const isAdmin = await checkUserRole('admin');
        if (!isAdmin) {
          showAlert(t('AdminCompanyProfileScreen', 'accessDenied'), t('AdminCompanyProfileScreen', 'accessDenied'));
          navigation.goBack();
          return;
        }
        
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          showAlert(t('AdminCompanyProfileScreen', 'userNotFound'), t('AdminCompanyProfileScreen', 'userNotFound'));
          await signOut(navigation);
          return;
        }
        
        // Check if user is permitted to work
        if (user.app_metadata?.permitted_to_work === false) {
          showAlert(t('AdminCompanyProfileScreen', 'accessRestricted'), t('AdminCompanyProfileScreen', 'accessRestricted'));
          // We don't navigate away, just show the alert
        }
        
        await fetchCompanyDetails();
        await fetchCountries();
        // Don't call fetchAgentsSummary here
      } catch (error) {
        console.error('Error in initial setup:', error);
        showAlert(t('AdminCompanyProfileScreen', 'loadDataError'), t('AdminCompanyProfileScreen', 'loadDataError'));
      } finally {
        setLoading(false);
      }
    };
    
    checkPermissionAndFetchData();
  }, [companyId, navigation]);

  // Add a separate useEffect for fetching agent summary that depends on company
  useEffect(() => {
    if (company) {
      fetchAgentsSummary();
    }
  }, [company]);

  const fetchCompanyDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
        countries:company_country(id, country_name)
        `)
        .eq('id', companyId)
        .single();
        
      if (error) throw error;
      if (!data) throw new Error('Company not found');
      
      setCompany(data);
      setCompanyName(data.company_name || '');
      setCompanyAddress(data.address || '');
      setCompanyUrl(data.url || '');
      setCompanyEmail(data.company_email || '');
      setCompanyPhone(data.phone || '');
      setCountryId(data?.countries?.id || null);
      setPermittedToWork(data.permitted_to_work);
      setLicenseNum(data.license_num || '');
    } catch (error) {
      console.error('Error fetching company details:', error);
         showAlert(
      t('AdminCompanyProfileScreen', 'loadError'), 
      t('AdminCompanyProfileScreen', 'loadError'),
      [
        { text: t('AdminCompanyProfileScreen', 'tryAgain'), onPress: () =>{
        setTimeout(() => fetchCompanyDetails(), 100);

               } 
      },
        { text: t('AdminCompanyProfileScreen', 'cancel'), style: 'cancel' }
      ]
    );
      return;
    }
  };

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, country_name')
        .order('country_name');
        
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
      showAlert(t('AdminCompanyProfileScreen', 'loadCountriesError'), t('AdminCompanyProfileScreen', 'loadCountriesError'));
    }
  };

  const fetchAgentsSummary = async () => {
    try {
      if (!company) return;
      
      // Check if company has a user_id
      if (!company.user_id) {
        console.log("Company doesn't have a user_id, can't fetch agent summary");
        // Set empty data for unsigned up companies
        setAgentsSummary([]);
        setSummaryStats({
          totalAgents: 0,
          notViewedOffers: 0,
          viewedOffers: 0,
          rejectedOffers: 0,
          acceptedOffers: 0
        });
        return;
      }
      
      console.log("Fetching agent summary for company user_id:", company.user_id);
      
      const { data, error } = await supabase
        .rpc('get_agents_offers_summary', { company: company.user_id });
        
      if (error) throw error;
      
      
      
      if (data) {
        setAgentsSummary(data);
        
        // Calculate summary statistics
        const stats = {
          totalAgents: data.length,
          notViewedOffers: 0,
          viewedOffers: 0,
          rejectedOffers: 0,
          acceptedOffers: 0
        };
        
        data.forEach(agent => {
          stats.notViewedOffers += agent.not_viewed_offers || 0;
          stats.viewedOffers += agent.viewed_offers || 0;
          stats.rejectedOffers += agent.rejected_offers || 0;
          stats.acceptedOffers += agent.accepted_offers || 0;
        });
        
        setSummaryStats(stats);
      }
    } catch (error) {
      console.error('Error fetching agents summary:', error);
      showAlert(t('AdminCompanyProfileScreen', 'loadAgentsSummaryError'), t('AdminCompanyProfileScreen', 'loadAgentsSummaryError'));
    }
  };

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setUrlError('');
    setEmailError('');
    setPhoneError('');
    setLicenseError(''); 
    // Validate URL if provided
    if (companyUrl && !validUrl(companyUrl)) {
      setUrlError(t('AdminCompanyProfileScreen', 'validUrlError'));
      isValid = false;
    }
    
    // Validate email if provided
    if (companyEmail && !validEmail(companyEmail)) {
      setEmailError(t('AdminCompanyProfileScreen', 'validEmailError'));
      isValid = false;
    }
    
    // Validate phone number if provided
    if (companyPhone && !validPhoneNumber(companyPhone)) {
      setPhoneError(t('AdminCompanyProfileScreen', 'validPhoneError'));
      isValid = false;
    }
    if (licenseNum && licenseNum.trim().length < 2) {
  setLicenseError(t('AdminCompanyProfileScreen', 'validLicenseError'));
  isValid = false;
}
    return isValid;
  };

  const handleUpdateCompany = async () => {
    try {
      // Check if user is authenticated and has permission
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('AdminCompanyProfileScreen', 'userNotFound'), t('AdminCompanyProfileScreen', 'userNotFound'));
        await signOut(navigation);
        return;
      }
      
      if (user.app_metadata?.permitted_to_work === false) {
        showAlert(t('AdminCompanyProfileScreen', 'updateDenied'), t('AdminCompanyProfileScreen', 'updateDenied'));
        return;
      }
      
      // Validate form
      if (!validateForm()) return;
      
      // Update company in database
      const { error } = await supabase
        .from('companies')
        .update({
          company_name: companyName,
          company_country: countryId,
          address: companyAddress,
          url: companyUrl,
          company_email: companyEmail,
          phone: companyPhone,
          permitted_to_work: permittedToWork,
          license_num: licenseNum
        })
        .eq('id', companyId);

      if (error) throw error;

      // Update local state
      await fetchCompanyDetails();
      
      showAlert(t('AdminCompanyProfileScreen', 'updateSuccess'), t('AdminCompanyProfileScreen', 'updateSuccess'));
      setEditMode(false);
    } catch (error) {
      console.error('Error updating company:', error);
      showAlert(t('AdminCompanyProfileScreen', 'updateError'), t('AdminCompanyProfileScreen', 'updateError'));
    }
  };

  const handleDeleteCompany = async () => {
    try {
      setDeleteLoading(true);
      
      // Check if user is authenticated and has permission
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('AdminCompanyProfileScreen', 'userNotFound'), t('AdminCompanyProfileScreen', 'userNotFound'));
        await signOut(navigation);
        return;
      }
      
      if (user.app_metadata?.permitted_to_work === false) {
        showAlert(t('AdminCompanyProfileScreen', 'deleteDenied'), t('AdminCompanyProfileScreen', 'deleteDenied'));
        return;
      }

      // Delete company from database
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      showAlert(t('AdminCompanyProfileScreen', 'deleteSuccess'), t('AdminCompanyProfileScreen', 'deleteSuccess'));
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting company:', error);
      showAlert(t('AdminCompanyProfileScreen', 'deleteError'), t('AdminCompanyProfileScreen', 'deleteError'));
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container}>
        {/* Company Info Card */}
        <Card containerStyle={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('AdminCompanyProfileScreen', 'companyProfile')}</Text>
            {!editMode && (
              <TouchableOpacity onPress={() => setEditMode(true)}>
                <Icon name="pencil" type="ionicon" color="#007bff" />
              </TouchableOpacity>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminCompanyProfileScreen', 'companyName')}</Text>
            <Text style={styles.value}>{company?.company_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminCompanyProfileScreen', 'country')}</Text>
            <Text style={styles.value}>{company?.countries?.country_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminCompanyProfileScreen', 'headquarter')}</Text>
            <Text style={styles.value}>{company?.address || t('AdminCompanyProfileScreen', 'notSpecified')}</Text>
          </View>
          <View style={styles.infoRow}>
  <Text style={styles.label}>{t('AdminCompanyProfileScreen', 'licenseNumber')}</Text>
  <Text style={styles.value}>{company?.license_num || t('AdminCompanyProfileScreen', 'notSpecified')}</Text>
</View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminCompanyProfileScreen', 'website')}</Text>
            <Text style={styles.value}>{company?.url || t('AdminCompanyProfileScreen', 'notSpecified')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminCompanyProfileScreen', 'email')}</Text>
            <Text style={styles.value}>{company?.company_email || t('AdminCompanyProfileScreen', 'notSpecified')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminCompanyProfileScreen', 'phone')}</Text>
            <Text style={styles.value}>{company?.phone || t('AdminCompanyProfileScreen', 'notSpecified')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminCompanyProfileScreen', 'status')}</Text>
            <Text style={[
              styles.statusText, 
              company?.permitted_to_work ? styles.activeStatus : styles.inactiveStatus
            ]}>
              {company?.permitted_to_work ? t('AdminCompanyProfileScreen', 'active') : t('AdminCompanyProfileScreen', 'inactive')}
            </Text>
          </View>
        </Card>
        
        {/* Agents Summary Card */}
        <Card containerStyle={styles.card}>
          <Text style={styles.cardTitle}>{t('AdminCompanyProfileScreen', 'agentsSummary')}</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="people" type="ionicon" color="#007bff" size={24} />
              <Text style={styles.statValue}>{summaryStats.totalAgents}</Text>
              <Text style={styles.statLabel}>{t('AdminCompanyProfileScreen', 'totalAgents')}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="eye-off" type="ionicon" color="#ffc107" size={24} />
              <Text style={styles.statValue}>{summaryStats.notViewedOffers}</Text>
              <Text style={styles.statLabel}>{t('AdminCompanyProfileScreen', 'notViewed')}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="eye" type="ionicon" color="#17a2b8" size={24} />
              <Text style={styles.statValue}>{summaryStats.viewedOffers}</Text>
              <Text style={styles.statLabel}>{t('AdminCompanyProfileScreen', 'viewed')}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="close-circle" type="ionicon" color="#dc3545" size={24} />
              <Text style={styles.statValue}>{summaryStats.rejectedOffers}</Text>
              <Text style={styles.statLabel}>{t('AdminCompanyProfileScreen', 'rejected')}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="checkmark-circle" type="ionicon" color="#28a745" size={24} />
              <Text style={styles.statValue}>{summaryStats.acceptedOffers}</Text>
              <Text style={styles.statLabel}>{t('AdminCompanyProfileScreen', 'accepted')}</Text>
            </View>
          </View>
        </Card>
        
        {/* Delete Button */}
        <Button
          title={t('AdminCompanyProfileScreen', 'deleteCompany')}
          icon={<Icon name="trash" type="ionicon" color="white" style={{ marginRight: 10 }} />}
          buttonStyle={styles.deleteButton}
          containerStyle={styles.deleteButtonContainer}
          onPress={() => setDeleteConfirmVisible(true)}
        />
        
        {/* Edit Company Overlay */}
        <Overlay
          isVisible={editMode}
          onBackdropPress={() => setEditMode(false)}
          overlayStyle={styles.overlay}
        >
          <ScrollView>
            <Text style={styles.overlayTitle}>{t('AdminCompanyProfileScreen', 'editCompany')}</Text>
            
            <Input
              label={t('AdminCompanyProfileScreen', 'companyNameLabel')}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder={t('AdminCompanyProfileScreen', 'enterCompanyName')}
            />
            
            <Text style={styles.pickerLabel}>{t('AdminCompanyProfileScreen', 'countryLabel')}</Text>
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
              placeholder={t('AdminCompanyProfileScreen', 'selectCountry')}
              searchPlaceholder={t('AdminCompanyProfileScreen', 'searchCountry')}
              value={countryId}
              onChange={item => {
                setCountryId(item.value);
              }}
              renderItem={item => (
                <View style={styles.dropdownItem}>
                  <Text style={styles.textItem}>{item.label}</Text>
                </View>
              )}
            />
            <Input
  label={t('AdminCompanyProfileScreen', 'licenseNumberLabel')}
  value={licenseNum}
  onChangeText={(text) => {
    setLicenseNum(text);
    if (licenseError) setLicenseError('');
  }}
  placeholder={t('AdminCompanyProfileScreen', 'enterLicenseNumber')}
  errorMessage={licenseError}
/>
            <Input
              label={t('AdminCompanyProfileScreen', 'addressLabel')}
              value={companyAddress}
              onChangeText={setCompanyAddress}
              placeholder={t('AdminCompanyProfileScreen', 'enterAddress')}
              multiline
            />
            
            <Input
              label={t('AdminCompanyProfileScreen', 'websiteUrlLabel')}
              value={companyUrl}
              onChangeText={(text) => {
                setCompanyUrl(text);
                if (urlError) setUrlError('');
              }}
              placeholder={t('AdminCompanyProfileScreen', 'enterWebsiteUrl')}
              errorMessage={urlError}
            />
            
            { !company.user_id &&  (<Input
              label={t('AdminCompanyProfileScreen', 'emailLabel')}
              value={companyEmail}
              onChangeText={(text) => {
                setCompanyEmail(text);
                if (emailError) setEmailError('');
              }}
              placeholder={t('AdminCompanyProfileScreen', 'enterEmail')}
              errorMessage={emailError}
            />) }
            
            <Input
              label={t('AdminCompanyProfileScreen', 'phoneLabel')}
              value={companyPhone}
              onChangeText={(text) => {
                setCompanyPhone(text);
                if (phoneError) setPhoneError('');
              }}
              placeholder={t('AdminCompanyProfileScreen', 'enterPhone')}
              keyboardType="phone-pad"
              errorMessage={phoneError}
            />
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>{t('AdminCompanyProfileScreen', 'permittedToWork')}</Text>
              <Switch
                value={permittedToWork}
                onValueChange={setPermittedToWork}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={permittedToWork ? "#f5dd4b" : "#f4f3f4"}
              />
            </View>
            
            <Button
              title={t('AdminCompanyProfileScreen', 'updateCompany')}
              icon={<Icon name="save" type="ionicon" color="white" style={{ marginRight: 10 }} />}
              buttonStyle={styles.updateButton}
              onPress={handleUpdateCompany}
            />
            
            <Button
              title={t('AdminCompanyProfileScreen', 'cancel')}
              type="outline"
              icon={<Icon name="close" type="ionicon" color="#007bff" style={{ marginRight: 10 }} />}
              buttonStyle={styles.cancelButton}
              onPress={() => setEditMode(false)}
            />
          </ScrollView>
        </Overlay>
        
        {/* Delete Confirmation Overlay */}
        <Overlay
          isVisible={deleteConfirmVisible}
          onBackdropPress={() => setDeleteConfirmVisible(false)}
          overlayStyle={styles.confirmOverlay}
        >
          <Text style={styles.confirmTitle}>{t('AdminCompanyProfileScreen', 'confirmDeletion')}</Text>
          <Text style={styles.confirmMessage}>{t('AdminCompanyProfileScreen', 'confirmDeleteMessage')}</Text>
          <View style={styles.confirmButtons}>
            <Button
              title={t('AdminCompanyProfileScreen', 'cancel')}
              type="outline"
              icon={<Icon name="close" type="ionicon" color="#007bff" style={{ marginRight: 10 }} />}
              buttonStyle={styles.cancelButton}
              onPress={() => setDeleteConfirmVisible(false)}
            />
            <Button
              title={t('AdminCompanyProfileScreen', 'delete')}
              icon={<Icon name="trash" type="ionicon" color="white" style={{ marginRight: 10 }} />}
              buttonStyle={styles.deleteConfirmButton}
              loading={deleteLoading}
              onPress={handleDeleteCompany}
            />
          </View>
        </Overlay>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 10,
    margin: 15,
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 120,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeStatus: {
    color: '#28a745',
  },
  inactiveStatus: {
    color: '#dc3545',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    marginBottom: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 5,
  },
  deleteButtonContainer: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  overlay: {
    borderRadius: 10,
    padding: 20,
    width: '90%',
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  dropdown: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#aaa',
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateButton: {
    backgroundColor: '#28a745',
    borderRadius: 5,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 5,
    borderColor: '#007bff',
    borderWidth: 1,
  },
  confirmOverlay: {
    borderRadius: 10,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  deleteConfirmButton: {
    backgroundColor: '#dc3545',
    borderRadius: 5,
  },
  dropdownItem: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textItem: {
    flex: 1,
    fontSize: 16,
  },
});
