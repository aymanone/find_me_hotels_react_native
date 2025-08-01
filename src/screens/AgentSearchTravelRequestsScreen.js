import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList,  } from 'react-native';
import { Button } from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import { checkUserRole,getCurrentUser } from '../utils/auth';
import  supabase  from '../config/supabase';
import {MAXIMUM_OFFERS} from '../config/CONSTANTS';
import { useNavigation } from '@react-navigation/native';
import {showAlert} from "../components/ShowAlert";

const AgentSearchTravelRequestsScreen = () => {
  const navigation = useNavigation();
  const [agent, setAgent] = useState(null);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [requestOption, setRequestOption] = useState('preferred requests');
   const [localRequestOption, setLocalRequestOption] = useState('all');
  const [travelRequests, setTravelRequests] = useState([]);
  const [sortOption, setSortOption] = useState('smaller first');
  const [sortField, setSortField] = useState('min_budget');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [requestsWithDetails, setRequestsWithDetails] = useState([]);
  

  // Options for dropdowns
  const requestOptions = [
    { label: 'Preferred Requests', value: 'preferred requests' },
    { label: 'All Requests', value: 'all requests' },
  ];
   const localRequestOptions = [
    { label: 'All', value: 'all' },
     { label: 'Preferred', value: 'preferred' },
  ];

  const sortOptions = [
    { label: 'Smaller First', value: 'smaller first' },
    { label: 'Bigger First', value: 'bigger first' },
  ];

  const sortFieldOptions = [
    { label: 'Min Budget', value: 'min_budget' },
    { label: 'Max Budget', value: 'max_budget' },
    { label: 'Duration', value: 'duration' },
    { label: 'Country', value: 'request_country_name' },
    { label: 'Nationality', value: 'travelers_nationality_name' },
  ];

  useEffect(() => {
    checkUserIsAgent();
    fetchCountries();
  }, []);

  const checkUserIsAgent = async () => {
    const isAgent = await checkUserRole('agent');
    if (!isAgent) {
      showAlert('Access Denied', 'You must be an agent to access this screen.');
      navigation.goBack();
      return;
    }
    fetchAgentData();
  };

  const fetchAgentData = async () => {
    try {
      const user= await getCurrentUser();
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
      showAlert('Error', 'Failed to fetch agent data');
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
  { label: "Preferred Requests", value: "preferred" },
  ...data.map(country => ({
    label: country.country_name,
    value: country.id
  }))
]);
    } catch (error) {
      console.error('Error fetching countries:', error);
      showAlert('Error', 'Failed to fetch countries');
    }
  };

  const searchLocalTravelers = async () => {
    try {
      const user = await getCurrentUser();
      if (!user || !agent?.agent_country) {
        showAlert('Error', 'Agent country information not available');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const formattedDate = today.toISOString();
     let response;
     if(localRequestOption == "all"){

       response = await supabase.rpc('agent_available_travel_requests_by_nationality', {
         p_agent_id: user.id,
        p_agent_country: agent.agent_country,
       
        // Only difference!
         p_max_offers: MAXIMUM_OFFERS,
        p_start_date: formattedDate
       
      });
   }
     else{
          response = await supabase.rpc('agent_preferred_travel_requests_by_nationality', {
         p_agent_id: user.id,
        p_agent_country: agent.agent_country,
       
        // Only difference!
         p_max_offers: MAXIMUM_OFFERS,
        p_start_date: formattedDate
       
      });
  }

      // Rest is identical to main search
      if (response.error) throw response.error;
      setRequestsWithDetails(response.data || []);
      setShowSortOptions((response.data || []).length > 0);
      
    } catch (error) {
      console.error('Error searching local travelers:', error);
      showAlert('Error', 'Failed to search travelers from your country');
    }
  };

  const searchTravelRequests = async () => {
    if (!selectedCountry) {
      showAlert('Error', 'Please select a country');
      return;
    }

    try {
     
      const user = await getCurrentUser();
      if (!user) {
        showAlert('Error', 'User not authenticated');
        return;
      }
        // First verify the country exists
     if(selectedCountry !== "preferred"){
      const { data: countryCheck, error: countryError } = await supabase
        .from('countries')
        .select('id')
        .eq('id', selectedCountry)
        .single();
        if (!countryCheck) {
        console.error('Country validation error:', countryError);
        // Re-fetch countries as they might have changed
        await fetchCountries();
        showAlert('Error', 'Selected country is no longer available. Please select another country.');
        return;
      }
}
      
     
        let response;
      // Create a proper date object and format it correctly for PostgreSQL
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const formattedDate = today.toISOString(); // Convert to ISO string format
      if (selectedCountry === "preferred"){
        response = await supabase.rpc('agent_preferred_travel_requests', {
         p_agent_id: user.id,
        p_agent_country: agent.agent_country,
       
        // Only difference!
         p_max_offers: MAXIMUM_OFFERS,
        p_start_date: formattedDate
       
      });
}
     else if (requestOption === 'preferred requests') {
        // Call the RPC function for preferred requests
        response = await supabase.rpc('agent_preferred_travel_requests', {
          p_agent_id: user.id,
          p_request_country: selectedCountry,
          p_start_date:formattedDate, // Use the formatted date
          p_agent_country: agent?.agent_country || null, // Agent's country ID
          p_max_offers: MAXIMUM_OFFERS // Maximum number of offers allowed
        });
      } else {
        // Call the RPC function for all available requests
        response = await supabase.rpc('agent_available_travel_requests', {
          p_agent_id: user.id,
          p_request_country: selectedCountry,
          p_start_date:formattedDate, // Use the formatted date
          p_max_offers: MAXIMUM_OFFERS // Maximum number of offers allowed
        });
      }
      
      if (response.error) throw response.error;
      
      // Since the RPC function already includes all details, we can directly use the results
      setRequestsWithDetails(response.data || []);
      setShowSortOptions((response.data || []).length > 0);
      
    } catch (error) {
      console.error('Error searching travel requests:', error);
      showAlert('Error', 'Failed to search travel requests');
    }
    
  };

  const fetchRequestDetails = async (requests) => {
    try {
      // Get unique country and area IDs
      const countryIds = [...new Set(requests.map(req => req.request_country))];
      const areaIds = [...new Set(requests.map(req => req.request_area))];

      // Fetch country names
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('id, country_name')
        .in('id', countryIds);

      if (countriesError) throw countriesError;

      // Fetch area names
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('id, area_name')
        .in('id', areaIds);

      if (areasError) throw areasError;

      // Create a map for quick lookup
      const countryMap = {};
      countriesData.forEach(country => {
        countryMap[country.id] = country.country_name;
      });

      const areaMap = {};
      areasData.forEach(area => {
        areaMap[area.id] = area.area_name;
      });

      // Combine all data
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
      showAlert('Error', 'Failed to fetch request details');
    }
  };

  const sortRequests = (requests) => {
    const sortedRequests = [...requests];
    
    sortedRequests.sort((a, b) => {
      let valueA, valueB;
      
      if (sortField === 'duration') {
        valueA = a.duration;
        valueB = b.duration;
      } else if (sortField === 'request_country_name' || sortField === 'travelers_nationality_name') {
        // Handle string fields (country and nationality)
        valueA = a[sortField] || '';
        valueB = b[sortField] || '';
        
        // For string sorting, we need different comparison
        if (sortOption === 'smaller first') {
          return valueA.localeCompare(valueB);
        } else {
          return valueB.localeCompare(valueA);
        }
      } else {
        // Handle numeric fields (budgets)
        valueA = a[sortField] || 0;
        valueB = b[sortField] || 0;
      }
      
      // For numeric fields (budget, duration)
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
        style={[styles.requestCard,
           hasMaxOffers && styles.maxOffersCard]
        }
        onPress={() => navigateToRequestDetails(item.id)}
      >
        <View style={styles.row}>
          <Text style={styles.label}>Destination:</Text>
          <Text style={styles.value}>{item.request_country_name}, {item.request_area_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Dates:</Text>
          <Text style={styles.value}>
            {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Budget:</Text>
          <Text style={styles.value}>${item.min_budget} - ${item.max_budget}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Travelers:</Text>
          <Text style={styles.value}>
            {item.adults} Adults, {Array.isArray(item.children) ? item.children.length : 0} Children
          </Text>
        </View>
         <View style={styles.row}>
          <Text style={styles.label}>Nationality:</Text>
          <Text style={styles.value}>
           {item.travelers_nationality_name}
          </Text>
        </View>
         <View style={styles.row}>
          <Text style={styles.label}>Offers:</Text>
          <Text style={[styles.value
            , hasMaxOffers && styles.maxOffersCard
          ]}>{item.offers_number}
            {' Offers'}
            {item.offers_number >= MAXIMUM_OFFERS ?  "can't make new offers" : ''}
          </Text>
        </View>
         <View style={styles.detailsButtonContainer}>
        <Button
          title="View Details"
          type="outline"
          onPress={() => navigateToRequestDetails(item.id)}
          buttonStyle={styles.detailsButton}
          titleStyle={styles.detailsButtonText}
          icon={{
            name: hasMaxOffers? 'eye':'arrow-right',
            type: 'font-awesome',
            size: 15,
            color: '#2089dc'
          }}
          iconRight
        />
      </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Controller Section */}
      <View style={styles.searchController}>
        {/* Main Search Parameters Row */}
        <View style={styles.row}>
          <Dropdown
            style={styles.dropdown}
            data={requestOptions}
            labelField="label"
            valueField="value"
            placeholder="Request Type"
            value={requestOption}
            onChange={item => setRequestOption(item.value)}
          />

          <Dropdown
            style={styles.dropdown}
            data={countries}
            labelField="label"
            valueField="value"
            placeholder="Select Country"
            value={selectedCountry}
            search
            maxHeight={300}
            onChange={item => setSelectedCountry(item.value)}
          />
          
          <Button
            onPress={searchTravelRequests}
            buttonStyle={styles.searchButton}
            icon={{
              name: 'search',
              type: 'font-awesome',
              size: 18,
              color: '#ffffff'
            }}
          />
        </View>

        {/* Local Search Row */}
     

      
      </View>
       <View style={styles.localSearchRow}>
          <Text style={styles.maxOffersInfo}>Max {MAXIMUM_OFFERS} Offers per request</Text>
          <Dropdown
            style={styles.localDropdown}
            data={localRequestOptions}
            labelField="label"
            valueField="value"
            placeholder="Request Type"
            value={localRequestOption}
            onChange={item => setLocalRequestOption(item.value)}
          />

          <Button
            title="My Country Travelers"
            onPress={searchLocalTravelers}
            buttonStyle={styles.localSearchButton}
            titleStyle={styles.localSearchButtonText}
            icon={{
              name: 'users',
              type: 'font-awesome',
              size: 14,
              color: '#28a745'
            }}
            iconLeft
          />
        </View>
       {/* Sort Options Row - Only shown when there are results */}
        {showSortOptions && (
          <View style={styles.row}>
            <Dropdown
              style={styles.dropdown}
              data={sortFieldOptions}
              labelField="label"
              valueField="value"
              placeholder="Sort By"
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
              placeholder="Sort Order"
              value={sortOption}
              onChange={item => {
                setSortOption(item.value);
                setTimeout(handleSort, 100);
              }}
            />
            
            <Button
              title="Sort"
              onPress={handleSort}
              buttonStyle={styles.sortButton}
            />
          </View>
        )}
      {/* Travel Requests Details Section */}
      <FlatList
        data={requestsWithDetails}
        renderItem={renderTravelRequest}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.requestsList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No travel requests found. Try adjusting your search criteria.
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  searchController: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  localSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'nowrap',
  },
  searchButton: {
    backgroundColor: '#2089dc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minWidth: 45,
    borderRadius: 8,
  },
  sortButton: {
    backgroundColor: '#2089dc',
    paddingHorizontal: 12,
    marginRight: 8,
  },
  dropdown: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 8,
    flex: 1,
    minWidth: 120,
  },
  localDropdown: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 8,
    width: 100,
  },
  maxOffersInfo: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  localSearchButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 6,
    paddingVertical: 6,
    flexShrink: 0,
  },
  localSearchButtonText: {
    fontSize: 11,
    marginLeft: 2,
  },
  requestsList: {
    paddingBottom: 20,
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
  },
  label: {
    fontWeight: 'bold',
    width: 100,
  },
  value: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: 'gray',
  },
  detailsButtonContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  detailsButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderColor: '#2089dc',
  },
  detailsButtonText: {
    fontSize: 14,
    marginRight: 5,
  },
  maxOffersCard: {
    borderColor: '#dc3545',
    borderWidth: 2,
    opacity: 0.8,
  },
  maxOffersText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  maxOffersButton: {
    borderColor: '#dc3545',
  },
  maxOffersButtonText: {
    color: '#dc3545',
  },
});

export default AgentSearchTravelRequestsScreen;
