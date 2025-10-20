import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 

} from 'react-native';
import { Text, Card, Button, Icon,SearchBar  } from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser } from '../utils/auth';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, screenSize, responsive } from '../styles//theme';
import { useTranslation } from '../config/localization';

export default function AdminCompaniesListScreen({ navigation }) {
  const { t,language } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [search, setSearch] = useState('');
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
      setFilteredCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error.message);
      showAlert(t('Alerts', 'error'), t('AdminCompaniesListScreen', 'loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const updateSearch = (text) => {
  setSearch(text);
  
  if (text.trim() === '') {
    setFilteredCompanies(companies);
    return;
  }
  
  const filtered = companies.filter(company => {
    const searchTerm = text.toLowerCase();
    
    return company.company_name?.toLowerCase().includes(searchTerm) || 
           company.company_email?.toLowerCase().includes(searchTerm) ||
           company.countries?.country_name?.toLowerCase().includes(searchTerm);
  });
  
  setFilteredCompanies(filtered);
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
          titleStyle={{ color: theme.colors.primary }}
        />
      </View>
      <SearchBar
  placeholder={t('AdminCompaniesListScreen', 'searchCompaniesPlaceholder')}
  onChangeText={updateSearch}
  value={search}
  containerStyle={styles.searchBarContainer}
  inputContainerStyle={styles.searchBarInputContainer}
  lightTheme
  round
/>
      {filteredCompanies.length === 0 ? (
        <Card containerStyle={styles.noDataCard}>
          <Text style={styles.noDataText}>{t('AdminCompaniesListScreen', 'noCompaniesFound')}</Text>
        </Card>
      ) : (
        filteredCompanies.map((company) => (
          <Card key={company.id} containerStyle={styles.card}>
            <Card.Title style={styles.cardTitle}>{company.company_name}</Card.Title>
            
            <View style={styles.infoRow}>
              <Icon name="mail-outline" type="ionicon" size={theme.spacing.lg} color={theme.colors.primary} />
              <Text style={styles.infoText}>{company.company_email || t('AdminCompaniesListScreen', 'noEmailProvided')}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Icon name="globe-outline" type="ionicon" size={theme.spacing.lg} color={theme.colors.primary} />
              <Text style={styles.infoText}>
                {company.countries?.country_name || t('AdminCompaniesListScreen', 'countryNotSpecified')}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Icon name="location-outline" type="ionicon" size={theme.spacing.lg} color={theme.colors.primary} />
              <Text style={styles.infoText}>{company.address || t('AdminCompaniesListScreen', 'noAddressProvided')}</Text>
            </View>
            
            <Button
              title={t('AdminCompaniesListScreen', 'viewProfile')}
              onPress={() => viewCompanyProfile(company.id)}
              buttonStyle={styles.viewButton}
              icon={<Icon name="arrow-forward" type="ionicon"  color={theme.colors.textWhite} size={theme.spacing.lg} />}
              iconRight
              iconContainerStyle={styles.buttonIcon}
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
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  card: {
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundWhite,
    ...theme.shadows.card,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    textAlign: 'left',
    marginBottom: theme.spacing.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoText: {
    marginLeft: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },
  viewButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  buttonIcon: {
    marginLeft: theme.spacing.xs,
  },
  noDataCard: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundWhite,
    ...theme.shadows.card,
  },
  noDataText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
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
});