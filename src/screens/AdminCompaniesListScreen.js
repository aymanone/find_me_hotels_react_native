import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 

} from 'react-native';
import { Text, Card, Button, Icon } from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser } from '../utils/auth';
import {showAlert} from "../components/ShowAlert";
import { useTranslation } from '../config/localization';

export default function AdminCompaniesListScreen({ navigation }) {
  const { t,language } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is an admin
  useEffect(() => {
    const checkRole = async () => {
      const isAdmin = await checkUserRole('admin');
      if (!isAdmin) {
        showAlert(t('Alerts', 'error'), t('AdminCompaniesListScreen', 'accessDenied'));
        navigation.goBack();
      }
    };
    
    checkRole();
  }, [navigation]);

  // Fetch companies for the admin
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('Alerts', 'error'), t('AdminCompaniesListScreen', 'userNotFound'));
        return;
      }
      
      // Fetch companies where admin_id equals user.id
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          company_name,
          company_email,
          address,
          company_country,
          countries:company_country (country_name)
        `)
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error.message);
      showAlert(t('Alerts', 'error'), t('AdminCompaniesListScreen', 'loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  const viewCompanyProfile = (companyId) => {
    navigation.navigate("Home",{screen:'AdminCompanyProfile', params:{ companyId }});
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text h4>{t('AdminCompaniesListScreen', 'title')}</Text>
        <Button
         
          onPress={handleRefresh}
          loading={refreshing}
          type="clear"
          title={t('AdminCompaniesListScreen', 'updateCompanies')}
          titleStyle={{ color: '#007bff' }}
        />
      </View>
      
      {companies.length === 0 ? (
        <Card containerStyle={styles.noDataCard}>
          <Text style={styles.noDataText}>{t('AdminCompaniesListScreen', 'noCompaniesFound')}</Text>
        </Card>
      ) : (
        companies.map((company) => (
          <Card key={company.id} containerStyle={styles.card}>
            <Card.Title style={styles.cardTitle}>{company.company_name}</Card.Title>
            
            <View style={styles.infoRow}>
              <Icon name="mail-outline" type="ionicon" size={16} color="#007bff" />
              <Text style={styles.infoText}>{company.company_email || t('AdminCompaniesListScreen', 'noEmailProvided')}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Icon name="globe-outline" type="ionicon" size={16} color="#007bff" />
              <Text style={styles.infoText}>
                {company.countries?.country_name || t('AdminCompaniesListScreen', 'countryNotSpecified')}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Icon name="location-outline" type="ionicon" size={16} color="#007bff" />
              <Text style={styles.infoText}>{company.address || t('AdminCompaniesListScreen', 'noAddressProvided')}</Text>
            </View>
            
            <Button
              title={t('AdminCompaniesListScreen', 'viewProfile')}
              onPress={() => viewCompanyProfile(company.id)}
              buttonStyle={styles.viewButton}
              icon={<Icon name="arrow-forward" type="ionicon" color="#fff" size={16} style={styles.buttonIcon} />}
              iconRight
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  card: {
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    textAlign: 'left',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  viewButton: {
    backgroundColor: '#007bff',
    borderRadius: 5,
    marginTop: 10,
  },
  buttonIcon: {
    marginLeft: 5,
  },
  noDataCard: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
  },
});
