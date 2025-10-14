import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Button } from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import { checkUserRole, getCurrentUser } from '../utils/auth';
import supabase from '../config/supabase';
import { MAXIMUM_OFFERS } from '../config/CONSTANTS';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from "../components/ShowAlert";
import { useTranslation } from '../config/localization';
import { theme, commonStyles, screenSize, responsive } from '../styles/theme';

const AgentSearchTravelRequestsScreen = () => {
  const navigation = useNavigation();
  const { t, language } = useTranslation();
  const [agent, setAgent] = useState(null);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [requestOption, setRequestOption] = useState('preferred requests');
  const [searchType, setSearchType] = useState('destination');
  const [travelRequests, setTravelRequests] = useState([]);
  const [sortOption, setSortOption] = useState('smaller first');
  const [sortField, setSortField] = useState('min_budget');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [requestsWithDetails, setRequestsWithDetails] = useState([]);

  const requestOptions = [
    { label: t('AgentSearchTravelRequestsScreen', 'preferredRequests'), value: 'preferred requests' },
    { label: t('AgentSearchTravelRequestsScreen', 'allRequests'), value: 'all requests' },
  ];

  const searchTypeOptions = [
    { label: t('AgentSearchTravelRequestsScreen', 'searchByDestination'), value: 'destination' },
    { label: t('AgentSearchTravelRequestsScreen', 'searchByNationality'), value: 'nationality' },
  ];

  const sortOptions = [
    { label: t('AgentSearchTravelRequestsScreen', 'smallerFirst'), value: 'smaller first' },
    { label: t('AgentSearchTravelRequestsScreen', 'biggerFirst'), value: 'bigger first' },
  ];

  const sortFieldOptions = [
    { label: t('AgentSearchTravelRequestsScreen', 'minBudget'), value: 'min_budget' },
    { label: t('AgentSearchTravelRequestsScreen', 'maxBudget'), value: 'max_budget' },
    { label: t('AgentSearchTravelRequestsScreen', 'duration'), value: 'duration' },
    { label: t('AgentSearchTravelRequestsScreen', 'country'), value: 'request_country_name' },
    { label: t('AgentSearchTravelRequestsScreen', 'nationality'), value: 'travelers_nationality_name' },
    { label: t('AgentSearchTravelRequestsScreen', 'startDate'), value: 'start_date' },
    { label: t('AgentSearchTravelRequestsScreen', 'createdAt'), value: 'created_at' },
  ];

  useEffect(() => {
    checkUserIsAgent();
    fetchCountries();
  }, []);

  const checkUserIsAgent = async () => {
    const isAgent = await checkUserRole('agent');
    if (!isAgent) {
      showAlert(t('AgentSearchTravelRequestsScreen', 'accessDenied'), t('AgentSearchTravelRequestsScreen', 'accessDeniedMessage'));
      navigation.goBack();
      return;
    }
    fetchAgentData();
  };

  const fetchAgentData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setAgent(data);
    } catch (error) {
      console.error('Error fetching agent data:', error);
      showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'failedToFetchAgentData'));
    }
  };

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, country_name')
        .order('country_name');

      if (error) throw error;
      setCountries([
        { label: t('AgentSearchTravelRequestsScreen', 'preferredRequests'), value: "preferred" },
        ...data.map(country => ({
          label: country.country_name,
          value: country.id
        }))
      ]);
    } catch (error) {
      console.error('Error fetching countries:', error);
      showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'failedToFetchCountries'));
    }
  };

  const handleSearch = () => {
    if (searchType === 'destination') {
      searchTravelRequests();
    } else {
      searchByNationality();
    }
  };

  const searchByNationality = async () => {
    if (!selectedCountry) {
      showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'pleaseSelectNationality'));
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'userNotAuthenticated'));
        return;
      }

      if (selectedCountry !== "preferred") {
        const { data: countryCheck, error: countryError } = await supabase
          .from('countries')
          .select('id')
          .eq('id', selectedCountry)
          .single();
        if (!countryCheck) {
          console.error('Country validation error:', countryError);
          await fetchCountries();
          showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'nationalityNoLongerAvailable'));
          return;
        }
      }

      let response;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const formattedDate = today.toISOString();

      if (selectedCountry === "preferred") {
        response = await supabase.rpc('agent_preferred_travel_requests', {
          p_agent_id: user.id,
          p_agent_country: agent.agent_country,
          p_max_offers: MAXIMUM_OFFERS,
          p_start_date: formattedDate
        });
      } else if (requestOption === 'preferred requests') {
        response = await supabase.rpc('agent_preferred_travel_requests_by_nationality', {
          p_agent_id: user.id,
          p_travelers_nationality: selectedCountry,
          p_agent_country: agent?.agent_country || null,
          p_max_offers: MAXIMUM_OFFERS,
          p_start_date: formattedDate
        });
      } else {
        response = await supabase.rpc('agent_available_travel_requests_by_nationality', {
          p_agent_id: user.id,
          p_travelers_nationality: selectedCountry,
          p_max_offers: MAXIMUM_OFFERS,
          p_start_date: formattedDate
        });
      }

      if (response.error) throw response.error;
      setRequestsWithDetails(response.data || []);
      setShowSortOptions((response.data || []).length > 0);

    } catch (error) {
      console.error('Error searching by nationality:', error);
      showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'failedToSearchByNationality'));
    }
  };

  const searchTravelRequests = async () => {
    if (!selectedCountry) {
      showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'pleaseSelectCountry'));
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'userNotAuthenticated'));
        return;
      }

      if (selectedCountry !== "preferred") {
        const { data: countryCheck, error: countryError } = await supabase
          .from('countries')
          .select('id')
          .eq('id', selectedCountry)
          .single();
        if (!countryCheck) {
          console.error('Country validation error:', countryError);
          await fetchCountries();
          showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'countryNoLongerAvailable'));
          return;
        }
      }

      let response;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const formattedDate = today.toISOString();

      if (selectedCountry === "preferred") {
        response = await supabase.rpc('agent_preferred_travel_requests', {
          p_agent_id: user.id,
          p_agent_country: agent.agent_country,
          p_max_offers: MAXIMUM_OFFERS,
          p_start_date: formattedDate
        });
      } else if (requestOption === 'preferred requests') {
        response = await supabase.rpc('agent_preferred_travel_requests', {
          p_agent_id: user.id,
          p_request_country: selectedCountry,
          p_start_date: formattedDate,
          p_agent_country: agent?.agent_country || null,
          p_max_offers: MAXIMUM_OFFERS
        });
      } else {
        response = await supabase.rpc('agent_available_travel_requests', {
          p_agent_id: user.id,
          p_request_country: selectedCountry,
          p_start_date: formattedDate,
          p_max_offers: MAXIMUM_OFFERS
        });
      }

      if (response.error) throw response.error;

      setRequestsWithDetails(response.data || []);
      setShowSortOptions((response.data || []).length > 0);

    } catch (error) {
      console.error('Error searching travel requests:', error);
      showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'failedToSearchTravelRequests'));
    }
  };

  const fetchRequestDetails = async (requests) => {
    try {
      const countryIds = [...new Set(requests.map(req => req.request_country))];
      const areaIds = [...new Set(requests.map(req => req.request_area))];

      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('id, country_name')
        .in('id', countryIds);

      if (countriesError) throw countriesError;

      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('id, area_name')
        .in('id', areaIds);

      if (areasError) throw areasError;

      const countryMap = {};
      countriesData.forEach(country => {
        countryMap[country.id] = country.country_name;
      });

      const areaMap = {};
      areasData.forEach(area => {
        areaMap[area.id] = area.area_name;
      });

      const detailedRequests = requests.map(req => {
        const startDate = new Date(req.start_date);
        const endDate = new Date(req.end_date);
        const durationInDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        return {
          ...req,
          country_name: countryMap[req.request_country] || 'Unknown',
          area_name: areaMap[req.request_area] || 'Unknown',
          duration: durationInDays
        };
      });

      sortRequests(detailedRequests);
    } catch (error) {
      console.error('Error fetching request details:', error);
      showAlert(t('AgentSearchTravelRequestsScreen', 'error'), t('AgentSearchTravelRequestsScreen', 'failedToFetchRequestDetails'));
    }
  };

  const sortRequests = (requests) => {
    const sortedRequests = [...requests];

    sortedRequests.sort((a, b) => {
      let valueA, valueB;

      if (sortField === 'duration') {
        valueA = a.duration;
        valueB = b.duration;
      } else if (sortField === 'start_date' || sortField === 'created_at') {
        valueA = new Date(a[sortField] || 0);
        valueB = new Date(b[sortField] || 0);

        if (sortOption === 'smaller first') {
          return valueA - valueB;
        } else {
          return valueB - valueA;
        }
      } else if (sortField === 'request_country_name' || sortField === 'travelers_nationality_name') {
        valueA = a[sortField] || '';
        valueB = b[sortField] || '';

        if (sortOption === 'smaller first') {
          return valueA.localeCompare(valueB);
        } else {
          return valueB.localeCompare(valueA);
        }
      } else {
        valueA = a[sortField] || 0;
        valueB = b[sortField] || 0;
      }

      if (sortOption === 'smaller first') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });

    setRequestsWithDetails(sortedRequests);
  };

  const handleSort = () => {
    if (requestsWithDetails.length > 0) {
      sortRequests(requestsWithDetails);
    }
  };

  const navigateToRequestDetails = (requestId) => {
    navigation.navigate('AgentTravelRequestDetails', { requestId: requestId });
  };

  const renderTravelRequest = ({ item }) => {
    const hasMaxOffers = item.offers_number >= MAXIMUM_OFFERS;
    return (
      <TouchableOpacity
        style={[
          styles.requestCard,
          hasMaxOffers && styles.maxOffersCard
        ]}
        onPress={() => navigateToRequestDetails(item.id)}
      >
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>{t('AgentSearchTravelRequestsScreen', 'destination')}</Text>
          <Text style={styles.dataValue}>{item.request_country_name}, {item.request_area_name}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>{t('AgentSearchTravelRequestsScreen', 'dates')}</Text>
          <Text style={styles.dataValue}>
            {new Date(item.start_date).toLocaleDateString('en-US', {
              month: '2-digit',
              day: 'numeric',
              year: 'numeric'
            })} - {new Date(item.end_date).toLocaleDateString('en-US', {
              month: '2-digit',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>{t('AgentSearchTravelRequestsScreen', 'budget')}</Text>
          <Text style={styles.dataValue}>${item.min_budget} - ${item.max_budget}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>{t('AgentSearchTravelRequestsScreen', 'travelers')}</Text>
          <Text style={styles.dataValue}>
            {t('AgentSearchTravelRequestsScreen', 'adultsLabel', { adults: item.adults })}, {t('AgentSearchTravelRequestsScreen', 'childrenLabel', { children: Array.isArray(item.children) ? item.children.length : 0 })}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>{t('AgentSearchTravelRequestsScreen', 'nationality')}</Text>
          <Text style={styles.dataValue}>
            {item.travelers_nationality_name}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>{t('AgentSearchTravelRequestsScreen', 'offers')}</Text>
          <Text style={[
            styles.dataValue,
            hasMaxOffers && styles.maxOffersText
          ]}>
            {t('AgentSearchTravelRequestsScreen', 'offersLabel', { count: item.offers_number })}
            {item.offers_number >= MAXIMUM_OFFERS ? ' ' + t('AgentSearchTravelRequestsScreen', 'cantMakeNewOffers') : ''}
          </Text>
        </View>
        <View style={styles.detailsButtonContainer}>
          <Button
            title={t('AgentSearchTravelRequestsScreen', 'viewDetails')}
            type="outline"
            onPress={() => navigateToRequestDetails(item.id)}
            buttonStyle={styles.detailsButton}
            titleStyle={styles.detailsButtonText}
           icon={{
             name: hasMaxOffers ? 'eye' : 'arrow-right',
             type: 'font-awesome',
             size: theme.responsiveComponents.icon.small,
             color: theme.colors.primary
}}
            iconRight
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchController}>
        <View style={styles.row}>
          <Dropdown
            style={styles.dropdown}
            data={requestOptions}
            labelField="label"
            valueField="value"
            placeholder={t('AgentSearchTravelRequestsScreen', 'requestType')}
            value={requestOption}
            onChange={item => setRequestOption(item.value)}
          />

          <Dropdown
            style={styles.dropdown}
            data={countries}
            labelField="label"
            valueField="value"
            placeholder={searchType === 'destination' ? t('AgentSearchTravelRequestsScreen', 'selectCountry') : t('AgentSearchTravelRequestsScreen', 'selectNationality')}
            value={selectedCountry}
            search
            maxHeight={300}
            onChange={item => setSelectedCountry(item.value)}
          />

          <Button
            onPress={handleSearch}
            buttonStyle={styles.searchButton}
         icon={{
            name: 'search',
            type: 'font-awesome',
            size: theme.responsiveComponents.icon.medium,
            color: theme.colors.textWhite
}}
          />
        </View>
      </View>

      <View style={styles.localSearchRow}>
        <Text style={styles.maxOffersInfo}>{t('AgentSearchTravelRequestsScreen', 'maxOffersInfo', { maxOffers: MAXIMUM_OFFERS })}</Text>
        <Text style={styles.searchTypeLabel}>{t('AgentSearchTravelRequestsScreen', 'searchBy')}</Text>
        <Dropdown
          style={styles.searchTypeDropdown}
          data={searchTypeOptions}
          labelField="label"
          valueField="value"
          placeholder={t('AgentSearchTravelRequestsScreen', 'selectSearchType')}
          value={searchType}
          onChange={item => setSearchType(item.value)}
        />
      </View>

      {showSortOptions && (
        <View style={styles.row}>
          <Dropdown
            style={styles.dropdown}
            data={sortFieldOptions}
            labelField="label"
            valueField="value"
            placeholder={t('AgentSearchTravelRequestsScreen', 'sortBy')}
            value={sortField}
            onChange={item => {
              setSortField(item.value);
              setTimeout(handleSort, 100);
            }}
          />

          <Dropdown
            style={styles.dropdown}
            data={sortOptions}
            labelField="label"
            valueField="value"
            placeholder={t('AgentSearchTravelRequestsScreen', 'sortOrder')}
            value={sortOption}
            onChange={item => {
              setSortOption(item.value);
              setTimeout(handleSort, 100);
            }}
          />

          <Button
            title={t('AgentSearchTravelRequestsScreen', 'sort')}
            onPress={handleSort}
            buttonStyle={styles.sortButton}
          />
        </View>
      )}

      <FlatList
        data={requestsWithDetails}
        renderItem={renderTravelRequest}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.requestsList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {t('AgentSearchTravelRequestsScreen', 'noRequestsFound')}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.responsiveSpacing.lg,
    backgroundColor: theme.colors.background,
  },
  searchController: {
    backgroundColor: theme.colors.backgroundWhite,
    padding: theme.responsiveSpacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.responsiveSpacing.lg,
    ...theme.shadows.md,
  },
  row: {
    flexDirection: screenSize.isXSmall ? 'column' : 'row',
    alignItems: 'center',
    marginBottom: theme.responsiveSpacing.md,
    flexWrap: 'wrap',
  },
  localSearchRow: {
    flexDirection: screenSize.isXSmall ? 'column' : 'row',
    alignItems: screenSize.isXSmall ? 'stretch' : 'center',
    justifyContent: 'space-between',
    marginBottom: theme.responsiveSpacing.md,
    flexWrap: 'nowrap',
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.responsiveSpacing.md,
    paddingVertical: theme.responsiveSpacing.sm,
    marginRight: theme.spacing.sm,
    minWidth: responsive(40, 45, 45, 45, 45),
    borderRadius: theme.borderRadius.md,
    marginBottom: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  sortButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.responsiveSpacing.md,
    marginRight: theme.spacing.sm,
    marginBottom: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  dropdown: {
    height: responsive(38, 40, 40, 40, 40),
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.responsiveSpacing.sm,
    marginRight: theme.spacing.sm,
    flex: 1,
    minWidth: screenSize.isXSmall ? '100%' : 120,
    backgroundColor: theme.colors.backgroundWhite,
    marginBottom: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  searchTypeDropdown: {
    height: responsive(38, 40, 40, 40, 40),
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.responsiveSpacing.sm,
    flex: screenSize.isXSmall ? 0 : 1,
    width: screenSize.isXSmall ? '100%' : 'auto',
    marginRight: screenSize.isXSmall ? 0 : theme.spacing.md,
    backgroundColor: theme.colors.backgroundWhite,
    marginTop: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  maxOffersInfo: {
    fontSize: theme.responsiveTypography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
    flex: screenSize.isXSmall ? 0 : 1,
    marginRight: theme.spacing.sm,
    marginBottom: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  searchTypeLabel: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    marginRight: theme.spacing.md,
    minWidth: screenSize.isXSmall ? '100%' : 70,
    marginBottom: screenSize.isXSmall ? theme.spacing.xs : 0,
  },
  requestsList: {
    paddingBottom: 20,
  },
  requestCard: {
    backgroundColor: theme.colors.backgroundWhite,
    padding: theme.responsiveSpacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.responsiveSpacing.md,
    ...theme.shadows.md,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  dataLabel: {
    fontWeight: theme.typography.fontWeight.semibold,
    width: screenSize.isXSmall ? 80 : 100,
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  dataValue: {
    flex: 1,
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.text,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  detailsButtonContainer: {
    alignItems: 'flex-end',
    marginTop: theme.spacing.sm,
  },
  detailsButton: {
    paddingVertical: responsive(4, 5, 5, 5, 5),
    paddingHorizontal: responsive(8, 10, 10, 10, 10),
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  detailsButtonText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    marginRight: 5,
  },
  maxOffersCard: {
    borderColor: theme.colors.error,
    borderWidth: 2,
    opacity: 0.8,
  },
  maxOffersText: {
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.bold,
  },
});

export default AgentSearchTravelRequestsScreen;