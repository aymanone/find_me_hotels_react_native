import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
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

export default function AdminCompanyProfileScreen({ route, navigation }) {
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
  
  // Validation errors
  const [urlError, setUrlError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
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
          Alert.alert('Access Denied', 'You do not have permission to access this page.');
          navigation.goBack();
          return;
        }
        
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          Alert.alert('Error', 'User not found. Please log in again.');
          await signOut(navigation);
          return;
        }
        
        // Check if user is permitted to work
        if (user.app_metadata?.permitted_to_work === false) {
          Alert.alert('Access Restricted', 'Your account is currently restricted.');
          // We don't navigate away, just show the alert
        }
        
        await fetchCompanyDetails();
        await fetchCountries();
        // Don't call fetchAgentsSummary here
      } catch (error) {
        console.error('Error in initial setup:', error);
        Alert.alert('Error', 'Failed to load data');
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
    } catch (error) {
      console.error('Error fetching company details:', error);
      Alert.alert('Error', 'Failed to load company details');
      navigation.goBack();
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
      Alert.alert('Error', 'Failed to load countries list');
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
      
      console.log("Agent summary data:", data);
      
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
      Alert.alert('Error', 'Failed to load agents summary');
    }
  };

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setUrlError('');
    setEmailError('');
    setPhoneError('');
    
    // Validate URL if provided
    if (companyUrl && !validUrl(companyUrl)) {
      setUrlError('Please enter a valid URL');
      isValid = false;
    }
    
    // Validate email if provided
    if (companyEmail && !validEmail(companyEmail)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    
    // Validate phone number if provided
    if (companyPhone && !validPhoneNumber(companyPhone)) {
      setPhoneError('Please enter a valid phone number');
      isValid = false;
    }
    
    return isValid;
  };

  const handleUpdateCompany = async () => {
    try {
      // Check if user is authenticated and has permission
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }
      
      if (user.app_metadata?.permitted_to_work === false) {
        Alert.alert('Access Denied', 'You do not have permission to update this company.');
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
          permitted_to_work: permittedToWork
        })
        .eq('id', companyId);

      if (error) throw error;

      // Update local state
      await fetchCompanyDetails();
      
      Alert.alert('Success', 'Company updated successfully');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating company:', error);
      Alert.alert('Error', 'Failed to update company');
    }
  };

  const handleDeleteCompany = async () => {
    try {
      setDeleteLoading(true);
      
      // Check if user is authenticated and has permission
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }
      
      if (user.app_metadata?.permitted_to_work === false) {
        Alert.alert('Access Denied', 'You do not have permission to delete this company.');
        return;
      }

      // Delete company from database
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      Alert.alert('Success', 'Company deleted successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting company:', error);
      Alert.alert('Error', 'Failed to delete company');
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
            <Text style={styles.cardTitle}>Company Profile</Text>
            {!editMode && (
              <TouchableOpacity onPress={() => setEditMode(true)}>
                <Icon name="pencil" type="ionicon" color="#007bff" />
              </TouchableOpacity>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Company Name:</Text>
            <Text style={styles.value}>{company?.company_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Country:</Text>
            <Text style={styles.value}>{company?.countries?.country_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Headquarter:</Text>
            <Text style={styles.value}>{company?.address || 'Not specified'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Website:</Text>
            <Text style={styles.value}>{company?.url || 'Not specified'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{company?.company_email || 'Not specified'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{company?.phone || 'Not specified'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[
              styles.statusText, 
              company?.permitted_to_work ? styles.activeStatus : styles.inactiveStatus
            ]}>
              {company?.permitted_to_work ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </Card>
        
        {/* Agents Summary Card */}
        <Card containerStyle={styles.card}>
          <Text style={styles.cardTitle}>Agents Summary</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="people" type="ionicon" color="#007bff" size={24} />
              <Text style={styles.statValue}>{summaryStats.totalAgents}</Text>
              <Text style={styles.statLabel}>Total Agents</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="eye-off" type="ionicon" color="#ffc107" size={24} />
              <Text style={styles.statValue}>{summaryStats.notViewedOffers}</Text>
              <Text style={styles.statLabel}>Not Viewed</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="eye" type="ionicon" color="#17a2b8" size={24} />
              <Text style={styles.statValue}>{summaryStats.viewedOffers}</Text>
              <Text style={styles.statLabel}>Viewed</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="close-circle" type="ionicon" color="#dc3545" size={24} />
              <Text style={styles.statValue}>{summaryStats.rejectedOffers}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="checkmark-circle" type="ionicon" color="#28a745" size={24} />
              <Text style={styles.statValue}>{summaryStats.acceptedOffers}</Text>
              <Text style={styles.statLabel}>Accepted</Text>
            </View>
          </View>
        </Card>
        
        {/* Delete Button */}
        <Button
          title="Delete Company"
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
            <Text style={styles.overlayTitle}>Edit Company</Text>
            
            <Input
              label="Company Name"
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Enter company name"
            />
            
            <Text style={styles.pickerLabel}>Country</Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconStyle={styles.iconStyle}
              data={countries}
              maxHeight={300}
              labelField="country_name"
              valueField="id"
              placeholder="Select country"
              searchPlaceholder="Search..."
              value={countryId}
              onChange={item => {
                setCountryId(item.id);
              }}
              searchable
            />
            
            <Input
              label="Address"
              value={companyAddress}
              onChangeText={setCompanyAddress}
              placeholder="Enter company address"
              multiline
            />
            
            <Input
              label="Website URL"
              value={companyUrl}
              onChangeText={(text) => {
                setCompanyUrl(text);
                if (urlError) setUrlError('');
              }}
              placeholder="Enter website URL"
              errorMessage={urlError}
            />
            
            { !company.user_id &&  (<Input
              label="Email"
              value={companyEmail}
              onChangeText={(text) => {
                setCompanyEmail(text);
                if (emailError) setEmailError('');
              }}
              placeholder="Enter company email"
              errorMessage={emailError}
            />) }
            
            <Input
              label="Phone Number"
              value={companyPhone}
              onChangeText={(text) => {
                setCompanyPhone(text);
                if (phoneError) setPhoneError('');
              }}
              placeholder="Enter company phone number"
              keyboardType="phone-pad"
              errorMessage={phoneError}
            />
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Permitted to Work:</Text>
              <Switch
                value={permittedToWork}
                onValueChange={setPermittedToWork}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={permittedToWork ? "#f5dd4b" : "#f4f3f4"}
              />
            </View>
            
            <Button
              title="Update Company"
              icon={<Icon name="save" type="ionicon" color="white" style={{ marginRight: 10 }} />}
              buttonStyle={styles.updateButton}
              onPress={handleUpdateCompany}
            />
            
            <Button
              title="Cancel"
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
          <Text style={styles.confirmTitle}>Confirm Deletion</Text>
          <Text style={styles.confirmMessage}>Are you sure you want to delete this company?</Text>
          <View style={styles.confirmButtons}>
            <Button
              title="Cancel"
              type="outline"
              icon={<Icon name="close" type="ionicon" color="#007bff" style={{ marginRight: 10 }} />}
              buttonStyle={styles.cancelButton}
              onPress={() => setDeleteConfirmVisible(false)}
            />
            <Button
              title="Delete"
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
  },
  placeholderStyle: {
    fontSize: 16,
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
});
