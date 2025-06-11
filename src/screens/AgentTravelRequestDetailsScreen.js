import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  TextInput,
  Alert
} from 'react-native';
import { 
  Text, 
  Button, 
  Icon, 
  Card, 
  Divider, 
  Input, 
  CheckBox 
} from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole } from '../utils/auth';
import { getCurrentUser } from '../utils/auth';

const AgentTravelRequestDetailsScreen = ({ route, navigation }) => {
  const { requestId } = route.params;
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [user, setUser] = useState(null);
  const [requestSectionCollapsed, setRequestSectionCollapsed] = useState(false);
  const [offerHotels, setOfferHotels] = useState([]);
  const [isPermittedToWork, setIsPermittedToWork] = useState(true);
  // Form fields for new hotel
  const [hotelName, setHotelName] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [hotelRooms, setHotelRooms] = useState('');
  const [hotelRoomSize, setHotelRoomSize] = useState('');
  const [hotelRating, setHotelRating] = useState(null);
  const [hotelCost, setHotelCost] = useState('');
  const [hotelNotes, setHotelNotes] = useState('');
  const [selectedMeals, setSelectedMeals] = useState({
    breakfast: false,
    lunch: false,
    dinner: false
  });
  const [addHotelSectionCollapsed, setAddHotelSectionCollapsed] = useState(false);

  // Rating dropdown data
  const ratingData = Array.from({ length: 8 }, (_, i) => ({
    label: `${i} stars`,
    value: i
  }));
  const checkAgentStatus = async () => {
  try {
    // Check if user is an agent
    const isUserAgent = await checkUserRole('agent');
    //setIsAgent(isUserAgent);
    
    if (!isUserAgent) {
      Alert.alert('Access Denied', 'You must be an agent to access this screen.');
      navigation.goBack();
      return false;
    }
    
    // Check if agent is permitted to work
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.app_metadata?.permitted_to_work === false) {
      setIsPermittedToWork(false);
      // We don't navigate away, just disable offer functionality
    }
    
    return true;
  } catch (error) {
    console.error('Error checking agent status:', error);
    Alert.alert('Error', 'Failed to verify your permissions.');
    navigation.goBack();
    return false;
  }
};

  useEffect(() => {
    const fetchData = async () => {
      try {
          // First check if user is an agent with proper permissions
      const isValidAgent = await checkAgentStatus();
      if (!isValidAgent) return;
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        // Get request details
        const { data, error } = await supabase
          .from('travel_requests_agent')
          .select('*')
          .eq('id', requestId)
          .single();
          
        if (error) throw error;
        console.log(data);
        setRequest(data);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load request details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [requestId]);

  const toggleRequestSection = () => {
    setRequestSectionCollapsed(!requestSectionCollapsed);
  };

  const addHotel = () => {
    if (offerHotels.length >= 3) {
      Alert.alert('Limit Reached', 'You can only add up to 3 hotels per offer');
      return;
    }
    
    // Validate inputs
    if (!hotelName || !hotelAddress || !hotelRooms || !hotelRoomSize || 
        hotelRating === null || !hotelCost) {
      Alert.alert('Missing Information', 'Please fill all required fields');
      return;
    }
    
    // Create meals array
    const meals = [];
    if (selectedMeals.breakfast) meals.push('breakfast');
    if (selectedMeals.lunch) meals.push('lunch');
    if (selectedMeals.dinner) meals.push('dinner');
    
    // Create new hotel object
    const newHotel = {
      name: hotelName,
      address: hotelAddress,
      rooms: parseInt(hotelRooms),
      room_size: parseInt(hotelRoomSize),
      rating: hotelRating,
      meals: meals,
      notes: hotelNotes,
      cost: parseFloat(hotelCost)
    };
    
    // Add to hotels array
    setOfferHotels([...offerHotels, newHotel]);
    
    // Reset form
    setHotelName('');
    setHotelAddress('');
    setHotelRooms('');
    setHotelRoomSize('');
    setHotelRating(null);
    setHotelCost('');
    setHotelNotes('');
    setSelectedMeals({
      breakfast: false,
      lunch: false,
      dinner: false
    });
    setAddHotelSectionCollapsed(true); // Collapse the add hotel section
  };

  const deleteHotel = (hotelKey) => {
    setOfferHotels(offerHotels.filter(hotel => 
      `${hotel.name}+${hotel.address}` !== hotelKey
    ));
  };

  const makeOffer = async () => {
    if (offerHotels.length === 0) {
      Alert.alert('No Hotels', 'Please add at least one hotel to make an offer');
      return;
    }
    
    try {
      // Calculate min and max cost
      const costs = offerHotels.map(hotel => hotel.cost);
      const minCost = Math.min(...costs);
      const maxCost = Math.max(...costs);
      
      // Calculate min and max rating
      const ratings = offerHotels.map(hotel => hotel.rating);
      const minRating = Math.min(...ratings);
      const maxRating = Math.max(...ratings);
      
      // Insert offer into database
      const { data, error } = await supabase
        .from('offers')
        .insert({
          min_cost: minCost,
          max_cost: maxCost,
          min_rating: minRating,
          max_rating: maxRating,
          num_of_hotels: offerHotels.length,
          hotels: offerHotels,
          agent_id: user.id,
          request_id: requestId,
          request_creator: request.creator_id
        });
      
      if (error) throw error;
      
      Alert.alert(
        'Success', 
        'Your offer has been submitted successfully',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      console.error('Error making offer:', error);
      Alert.alert('Error', 'Failed to submit offer. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Calculate min and max costs if hotels exist
  const costs = offerHotels.map(hotel => hotel.cost);
  const minCost = costs.length > 0 ? Math.min(...costs) : 0;
  const maxCost = costs.length > 0 ? Math.max(...costs) : 0;
  
  // Calculate min and max ratings if hotels exist
  const ratings = offerHotels.map(hotel => hotel.rating);
  const minRating = ratings.length > 0 ? Math.min(...ratings) : 0;
  const maxRating = ratings.length > 0 ? Math.max(...ratings) : 0;

  const userCanMakeOffer = user?.app_metadata?.permitted_to_work !== false && 
                          request?.offers_number < 30;

  return (
    <ScrollView style={styles.container}>
      {/* Request Section */}
      <Card containerStyle={styles.card}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={toggleRequestSection}
        >
          <Text style={styles.sectionTitle}>Request Details</Text>
          <Icon 
            name={requestSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
            type="ionicon" 
          />
        </TouchableOpacity>
        
        {!requestSectionCollapsed && request && (
          <View style={styles.sectionContent}>
            {/* Dates */}
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.label}>Start Date:</Text>
                <Text>{new Date(request.start_date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.label}>End Date:</Text>
                <Text>{new Date(request.end_date).toLocaleDateString()}</Text>
              </View>
            </View>
            
            {/* Destinations */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Country:</Text>
                <Text>{request.country_name}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Area:</Text>
                <Text>{request.area_name}</Text>
              </View>
            </View>
           
            {/* Travelers */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Travelers:</Text>
                <Text>Adults: {request.adults}</Text>
                {request.children && request.children > 0 ? (
                  <View>
                    <Text>Children: {request.children}</Text>
                    {request.children_ages && (
                      <View style={styles.childrenAges}>
                        <Text>Ages: {request.children_ages.join(', ')}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text>No children</Text>
                )}
              </View>
              {/* travelers nationality */}
            </View>
              <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>nationality:</Text>
                <Text>{request.travelers_nationality_name}</Text>
              </View>
            </View>
            {/* Hotels Info */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Hotel Information:</Text>
                <Text>Rating: {request.hotels_rating} stars</Text>
                <Text>Rooms: {request.rooms} rooms</Text>
                <Text>Meals: {request.meals?.join(', ') || 'None'}</Text>
              </View>
            </View>
            
            {/* Budget */}
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.label}>Min Budget:</Text>
                <Text>${request.min_budget}</Text>
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.label}>Max Budget:</Text>
                <Text>${request.max_budget}</Text>
              </View>
            </View>
            
            {/* Notes */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Notes:</Text>
                <ScrollView style={styles.notesContainer}>
                  <Text>{request.notes || 'No notes provided'}</Text>
                </ScrollView>
              </View>
            </View>
          </View>
        )}
      </Card>
      
      {/* Warning Section */}
      {request.offers_number >= 30 && (
        <Card containerStyle={styles.warningCard}>
          <Text style={styles.warningText}>
            This request already has the maximum number of offers (30).
            You cannot make additional offers.
          </Text>
        </Card>
      )}
      {/* Not Permitted Warning */}
    {!isPermittedToWork && (
  <Card containerStyle={styles.warningCard}>
    <Text style={styles.warningText}>
      You are not permitted to work on this request.
    </Text>
  </Card>
    )}
      {/* Offers Info Section */}
      {offerHotels.length > 0 && (
        <Card containerStyle={styles.card}>
          <Text style={styles.sectionTitle}>Offer Summary</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Min Cost:</Text>
              <Text>${minCost}</Text>
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Max Cost:</Text>
              <Text>${maxCost}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Min Rating:</Text>
              <Text>{minRating} stars</Text>
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Max Rating:</Text>
              <Text>{maxRating} stars</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Number of Hotels:</Text>
              <Text>{offerHotels.length}</Text>
            </View>
            <View style={styles.infoColumn}>
              {userCanMakeOffer && (
                <Button
                  title="Make Offer"
                  onPress={makeOffer}
                  buttonStyle={styles.makeOfferButton}
                />
              )}
            </View>
          </View>
        </Card>
      )}
      {/* Not Permitted Warning */}
      {user?.user_metadata?.permitted_to_work === false && (
        <Card containerStyle={styles.warningCard}>
          <Text style={styles.warningText}>
            You are not permitted to work on this request.
          </Text>
        </Card>
      )}

    {/* Add Hotel Section - Collapsible */}
{userCanMakeOffer && (
  <Card containerStyle={styles.card}>
    <TouchableOpacity 
      style={styles.sectionHeader} 
      onPress={() => setAddHotelSectionCollapsed(!addHotelSectionCollapsed)}
    >
      <Text style={styles.sectionTitle}>Add Hotel to Offer</Text>
      <Icon 
        name={addHotelSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
        type="ionicon" 
      />
    </TouchableOpacity>
    
    {!addHotelSectionCollapsed && (
      <View style={styles.sectionContent}>
        {/* Hotel Form */}
        <Input
          label="Hotel Name"
          value={hotelName}
          onChangeText={setHotelName}
        />
        <Input
          label="Hotel Address"
          value={hotelAddress}
          onChangeText={setHotelAddress}
        />
        <Input
          label="Number of Rooms"
          value={hotelRooms}
          onChangeText={setHotelRooms}
          keyboardType="numeric"
        />
        <Input
          label="Room Size"
          value={hotelRoomSize}
          onChangeText={setHotelRoomSize}
          keyboardType="numeric"
        />
        
        {/* Rating and Cost in same row */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.dropdownLabel}>Hotel Rating</Text>
            <Dropdown
              style={styles.dropdown}
              data={ratingData}
              labelField="label"
              valueField="value"
              value={hotelRating}
              onChange={item => setHotelRating(item.value)}
              placeholder="Select rating"
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.dropdownLabel}>Total Cost in $</Text>
            <Input
              value={hotelCost}
              onChangeText={setHotelCost}
              keyboardType="numeric"
              containerStyle={styles.inputContainer}
              inputContainerStyle={styles.inputInnerContainer}
            />
          </View>
        </View>
        
        <Input
          label="Notes"
          value={hotelNotes}
          onChangeText={setHotelNotes}
          multiline
        />
        
        {/* Meals in one row */}
        <Text style={styles.mealsLabel}>Meals</Text>
        <View style={styles.mealsContainer}>
          <CheckBox
            title="Breakfast"
            checked={selectedMeals.breakfast}
            onPress={() => setSelectedMeals({ ...selectedMeals, breakfast: !selectedMeals.breakfast })}
            containerStyle={styles.mealCheckbox}
          />
          <CheckBox
            title="Lunch"
            checked={selectedMeals.lunch}
            onPress={() => setSelectedMeals({ ...selectedMeals, lunch: !selectedMeals.lunch })}
            containerStyle={styles.mealCheckbox}
          />
          <CheckBox
            title="Dinner"
            checked={selectedMeals.dinner}
            onPress={() => setSelectedMeals({ ...selectedMeals, dinner: !selectedMeals.dinner })}
            containerStyle={styles.mealCheckbox}
          />
        </View>
        
        <Button
          title="Add Hotel"
          onPress={addHotel}
          buttonStyle={styles.addButton}
        />
      </View>
    )}
  </Card>
)}
    {/* Offer Hotels Section */}
{offerHotels.length > 0 && (
  <Card containerStyle={styles.card}>
    <Text style={styles.sectionTitle}>Added Hotels</Text>
    <Divider style={styles.divider} />
    
    {offerHotels.map((hotel, index) => (
      <Card key={`${hotel.name}+${hotel.address}`} containerStyle={styles.hotelItemCard}>
        <View style={styles.hotelHeader}>
          <Text style={styles.hotelName}>{hotel.name}</Text>
          <TouchableOpacity 
            onPress={() => deleteHotel(`${hotel.name}+${hotel.address}`)}
            style={styles.deleteIconContainer}
          >
            <Icon name="trash-outline" type="ionicon" color="#dc3545" size={20} />
          </TouchableOpacity>
        </View>
        
        <Divider style={styles.hotelDivider} />
        
        <View style={styles.hotelDetailsContainer}>
          <View style={styles.hotelDetailRow}>
            <Icon name="location-outline" type="ionicon" size={16} color="#007bff" />
            <Text style={styles.hotelDetailText}>{hotel.address}</Text>
          </View>
          
          <View style={styles.hotelDetailRow}>
            <Icon name="bed-outline" type="ionicon" size={16} color="#007bff" />
            <Text style={styles.hotelDetailText}>
              {hotel.rooms} {hotel.rooms === 1 ? 'room' : 'rooms'}, {hotel.room_size} meters²
            </Text>
          </View>
          
          <View style={styles.hotelDetailRow}>
            <Icon name="star" type="ionicon" size={16} color="#FFD700" />
            <Text style={styles.hotelDetailText}>{hotel.rating} stars</Text>
          </View>
          
          <View style={styles.hotelDetailRow}>
            <Icon name="restaurant-outline" type="ionicon" size={16} color="#007bff" />
            <Text style={styles.hotelDetailText}>
              Meals: {hotel.meals.length > 0 ? hotel.meals.join(', ') : 'None'}
            </Text>
          </View>
          
          <View style={styles.hotelDetailRow}>
            <Icon name="cash-outline" type="ionicon" size={16} color="#28a745" />
            <Text style={styles.hotelDetailText}>Total Cost: ${hotel.cost}</Text>
          </View>
          
          {hotel.notes && (
            <View style={styles.hotelDetailRow}>
              <Icon name="document-text-outline" type="ionicon" size={16} color="#007bff" />
              <Text style={styles.hotelDetailText}>Notes: {hotel.notes}</Text>
            </View>
          )}
        </View>
      </Card>
    ))}
  </Card>
)}

      
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
  card: {
    borderRadius: 10,
    marginBottom: 15,
  },
  warningCard: {
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
  },
  warningText: {
    color: '#856404',
    textAlign: 'center',
    fontWeight: 'bold',
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
  },
  notesContainer: {
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
  },
  offerSummary: {
    backgroundColor: '#e9ecef',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  summaryTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  hotelCard: {
    padding: 10,
    marginBottom: 10,
  },
  hotelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  hotelName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    padding: 5,
  },
  addHotelForm: {
    marginTop: 15,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
     marginHorizontal: 10,
    marginBottom: 10,
  },
  halfWidth: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#86939e',
    marginBottom: 5,
  },
  inputContainer: {
    paddingHorizontal: 0,
    height: 50,
  },
  inputInnerContainer: {
    borderColor: '#86939e',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#86939e',
    marginLeft: 10,
    marginBottom: 5,
  },
  dropdown: {
    height: 50,
    borderColor: '#86939e',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 15,
    marginHorizontal: 10,
  },
  mealsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#86939e',
    marginLeft: 10,
    marginBottom: 5,
  },
  mealsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    marginBottom: 15,
  },
  mealCheckbox: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    width: '30%',
  },
  addButton: {
    backgroundColor: '#28a745',
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: '#007bff',
    marginTop: 20,
  },
  childrenAges: {
    marginLeft: 10,
  },
  // Add these to your styles object
hotelItemCard: {
  borderRadius: 8,
  marginBottom: 10,
  padding: 10,
  borderWidth: 1,
  borderColor: '#e1e1e1',
},
hotelHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
deleteIconContainer: {
  padding: 5,
},
hotelDivider: {
  marginVertical: 8,
},
hotelDetailsContainer: {
  marginTop: 5,
},
hotelDetailRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 6,
},
hotelDetailText: {
  marginLeft: 8,
  fontSize: 14,
  color: '#333',
},
divider: {
  marginVertical: 10,
},
});

export default AgentTravelRequestDetailsScreen;