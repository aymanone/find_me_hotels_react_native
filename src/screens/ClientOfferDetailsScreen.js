import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Linking,
  Alert
} from 'react-native';
import { 
  Text, 
  Card, 
  Icon, 
  Divider 
} from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole } from '../utils/auth';

const ClientOfferDetailsScreen = ({ route, navigation }) => {
  const { offerId } = route.params;
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState(null);
  const [hotelsSectionCollapsed, setHotelsSectionCollapsed] = useState(false);
  const [agentSectionCollapsed, setAgentSectionCollapsed] = useState(false);

  useEffect(() => {
    const fetchOfferDetails = async () => {
      try {
        // First check if user is a client with proper permissions
        const isValidClient = await checkUserRole('client');
        if (!isValidClient) {
          Alert.alert('Access Denied', 'You do not have permission to view this page.');
          navigation.goBack();
          return;
        }
        
        // Fetch offer details with agent information
       const { data: offer, error } = await supabase
      .from('offers')
  .select(`
    num_of_hotels, hotels,status, min_rating, max_rating, min_cost, max_cost,
    agents!offers_agent_id_fkey (
      first_name, second_name, id, phone_number, messaging_app,
      companies!agents_company_id_fkey (company_name, url),
        countries!agents_agent_country_fkey(country_name)
    )
  `)
  .eq('id', offerId)
  .single();

        if (error) {
          console.error('Error fetching offer:', error);
          Alert.alert('Error', 'Failed to load offer details');
          return;
        }
        console.log(offer);
        setOffer(offer);
        // Test if you can query agents directly

        // Mark offer as viewed if not already
        if (offer.status !== 'viewed') {
          await supabase.rpc('mark_offer_as_viewed', { p_offer_id: offerId, p_status: 'viewed' });
        }
      } catch (error) {
        console.error('Error in fetchOfferDetails:', error);
        Alert.alert('Error', 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOfferDetails();
  }, [offerId, navigation]);

  const toggleHotelsSection = () => {
    setHotelsSectionCollapsed(!hotelsSectionCollapsed);
  };

  const toggleAgentSection = () => {
    setAgentSectionCollapsed(!agentSectionCollapsed);
  };

  const openUrl = (url) => {
    if (!url) return;
    
    // Add http:// if not present
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `http://${url}`;
    }
    
    Linking.canOpenURL(fullUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(fullUrl);
        } else {
          Alert.alert('Error', `Cannot open URL: ${fullUrl}`);
        }
      })
      .catch(err => console.error('Error opening URL:', err));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Offer not found or you don't have permission to view it.</Text>
      </View>
    );
  }

  const agent = offer.agents;

  return (
    <ScrollView style={styles.container}>
      {/* Offer Info Section */}
      <Card containerStyle={styles.card}>
        <Text style={styles.sectionTitle}>Offer Information</Text>
        <Divider style={styles.divider} />
        
        {/* Cost Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Min Cost:</Text>
            <Text style={styles.value}>${offer.min_cost}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Max Cost:</Text>
            <Text style={styles.value}>${offer.max_cost}</Text>
          </View>
        </View>
        
        {/* Rating Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Min Rating:</Text>
            <Text style={styles.value}>{offer.min_rating} stars</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Max Rating:</Text>
            <Text style={styles.value}>{offer.max_rating} stars</Text>
          </View>
        </View>
        
        {/* Number of Hotels */}
        <View style={styles.infoRow}>
          <View style={styles.fullWidth}>
            <Text style={styles.label}>Number of Hotels:</Text>
            <Text style={styles.value}>{offer.num_of_hotels}</Text>
          </View>
        </View>
      </Card>
      
      {/* Hotels Section */}
      <Card containerStyle={styles.card}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={toggleHotelsSection}
        >
          <Text style={styles.sectionTitle}>Hotels</Text>
          <Icon 
            name={hotelsSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
            type="ionicon" 
          />
        </TouchableOpacity>
        
        {!hotelsSectionCollapsed && offer.hotels && (
          <View style={styles.sectionContent}>
            {offer.hotels.map((hotel, index) => (
              <Card key={index} containerStyle={styles.hotelItemCard}>
                {/* Hotel Name */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="business-outline" type="ionicon" size={16} color="#007bff" />
                  <Text style={styles.hotelDetailText}>
                    <Text style={styles.hotelDetailLabel}>Name: </Text>
                    {hotel.name}
                  </Text>
                </View>
                
                {/* Hotel Address */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="location-outline" type="ionicon" size={16} color="#007bff" />
                  <Text style={styles.hotelDetailText}>
                    <Text style={styles.hotelDetailLabel}>Address: </Text>
                    {hotel.address}
                  </Text>
                </View>
                
                {/* Rooms and Room Size */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="bed-outline" type="ionicon" size={16} color="#007bff" />
                  <Text style={styles.hotelDetailText}>
                    <Text style={styles.hotelDetailLabel}>Rooms: </Text>
                    {hotel.rooms} {hotel.rooms === 1 ? 'room' : 'rooms'}, {hotel.room_size} meters²
                  </Text>
                </View>
                
                {/* Cost and Rating */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="star" type="ionicon" size={16} color="#FFD700" />
                  <Text style={styles.hotelDetailText}>
                    <Text style={styles.hotelDetailLabel}>Rating: </Text>
                    {hotel.rating} stars
                  </Text>
                </View>
                
                <View style={styles.hotelDetailRow}>
                  <Icon name="cash-outline" type="ionicon" size={16} color="#28a745" />
                  <Text style={styles.hotelDetailText}>
                    <Text style={styles.hotelDetailLabel}>Cost: </Text>
                    ${hotel.cost}
                  </Text>
                </View>
                
                {/* Meals */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="restaurant-outline" type="ionicon" size={16} color="#007bff" />
                  <Text style={styles.hotelDetailText}>
                    <Text style={styles.hotelDetailLabel}>Meals: </Text>
                    {hotel.meals && hotel.meals.length > 0 ? hotel.meals.join(', ') : 'None'}
                  </Text>
                </View>
                
                {/* Notes */}
                {hotel.notes && (
                  <View style={styles.hotelDetailRow}>
                    <Icon name="document-text-outline" type="ionicon" size={16} color="#007bff" />
                    <Text style={styles.hotelDetailText}>
                      <Text style={styles.hotelDetailLabel}>Notes: </Text>
                      {hotel.notes}
                    </Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </Card>
      
      {/* Agent Section */}
      <Card containerStyle={styles.card}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={toggleAgentSection}
        >
          <Text style={styles.sectionTitle}>Agent Information</Text>
          <Icon 
            name={agentSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
            type="ionicon" 
          />
        </TouchableOpacity>
        
        {!agentSectionCollapsed && agent && (
          <View style={styles.sectionContent}>
            {/* Agent Name */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Agent Name:</Text>
                <Text style={styles.value}>{agent.first_name} {agent.second_name}</Text>
              </View>
            </View>
            
            {/* Agent Contact */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Contact:</Text>
                <Text style={styles.value}>Phone: {agent.phone_number}</Text>
                <Text style={styles.value}>Messaging App: {agent.messaging_app}</Text>
              </View>
            </View>
            
            {/* Agent Country */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Country:</Text>
                <Text style={styles.value}>{agent.countries?.country_name || 'Not specified'}</Text>
              </View>
            </View>
            
            {/* Company Name */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Company:</Text>
                <Text style={styles.value}>{agent.companies?.company_name || 'Not specified'}</Text>
              </View>
            </View>
            
            {/* Company Address */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Company Address:</Text>
                <Text style={styles.value}>{agent.companies?.address || 'Not specified'}</Text>
              </View>
            </View>
            
            {/* Company URL */}
            {agent.companies?.url && (
              <View style={styles.infoRow}>
                <View style={styles.fullWidth}>
                  <Text style={styles.label}>Company Website:</Text>
                  <TouchableOpacity onPress={() => openUrl(agent.companies.url)}>
                    <Text style={styles.linkText}>{agent.companies.url}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </Card>
    </ScrollView>
  );
};

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  card: {
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 10,
  },
  sectionContent: {
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  infoColumn: {
    flex: 1,
  },
  fullWidth: {
    flex: 2,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  value: {
    fontSize: 16,
  },
  linkText: {
    color: '#007bff',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
  hotelItemCard: {
    borderRadius: 8,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  hotelDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hotelDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  hotelDetailLabel: {
    fontWeight: 'bold',
  },
});

export default ClientOfferDetailsScreen;