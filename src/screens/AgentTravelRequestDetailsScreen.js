import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
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
import {MAXIMUM_OFFERS, MAXIMUM_HOTELS} from '../config/CONSTANTS';
import {outDatedReq} from '../utils/dateUtils';
import { checkUserRole } from '../utils/auth';
import { getCurrentUser,signOut } from '../utils/auth';
import {inDateReq} from '../utils/dateUtils';
import {showAlert} from "../components/ShowAlert";
import { useTranslation } from '../config/localization';

const AgentTravelRequestDetailsScreen = ({ route, navigation }) => {
  const { t,language } = useTranslation();
  const { requestId, offerId } = route.params; // Added offerId parameter
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [user, setUser] = useState(null);
  const [requestSectionCollapsed, setRequestSectionCollapsed] = useState(true);
  const [offerHotels, setOfferHotels] = useState([]);
  const [isPermittedToWork, setIsPermittedToWork] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're editing
  const [existingOffer, setExistingOffer] = useState(null); // Store existing offer
  
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
  const [addHotelSectionCollapsed, setAddHotelSectionCollapsed] = useState(true);
  const [hotelsSectionCollapsed,setHotelsSectionCollapsed]= useState(false);
  const [editingHotelIndex, setEditingHotelIndex] = useState(-1); // Track which hotel is being edited
  
  // Rating dropdown data
  const ratingData = Array.from({ length: 8 }, (_, i) => ({
    label: t('AgentTravelRequestDetailsScreen', 'starsLabel', { count: i }),
    value: i
  }));
  
  const checkAgentStatus = async () => {
    try {
      // Check if user is an agent
      const isUserAgent = await checkUserRole('agent');
      //setIsAgent(isUserAgent);
      
      if (!isUserAgent) {
        showAlert(
          t('AgentTravelRequestDetailsScreen', 'accessDenied'), 
          t('AgentTravelRequestDetailsScreen', 'accessDeniedMessage')
        );
        navigation.goBack();
        return false;
      }
      
      // Check if agent is permitted to work
      const user  = await getCurrentUser();
      if (user?.app_metadata?.permitted_to_work === false) {
        setIsPermittedToWork(false);
        // We don't navigate away, just disable offer functionality
      }
      
      return true;
    } catch (error) {
      console.error('Error checking agent status:', error);
      showAlert(
        t('AgentTravelRequestDetailsScreen', 'error'), 
        t('AgentTravelRequestDetailsScreen', 'failedToVerifyPermissions')
      );
      navigation.goBack();
      return false;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
       // Reset state when component mounts or dependencies change
       setOfferHotels([]);
       setExistingOffer(null);
        // First check if user is an agent with proper permissions
        const isValidAgent = await checkAgentStatus();
        if (!isValidAgent) return;
        
        // Get current user
        const user= await getCurrentUser();
        if(!user) {
          showAlert(
            t('AgentTravelRequestDetailsScreen', 'error'), 
            t('AgentTravelRequestDetailsScreen', 'userNotFound')
          );
          await signOut(navigation);
          return;
        }
        
        // Check if we're in edit mode
        if (offerId) {
          setIsEditMode(true);
          
          // Fetch existing offer
          const { data: offerData, error: offerError } = await supabase
            .from('offers')
            .select('*')
            .eq('id', offerId)
            .single();
            
          if (offerError) throw offerError;
          
          setExistingOffer(offerData);
          setOfferHotels(offerData.hotels || []);
        } else{
          // check if there's an offer even when we don't have 
          // an offerId
          const {data:offerData,error:offerError} = await supabase.from('offers')
          .select('*')
          .eq('agent_id', user.id)
          .eq('request_id',requestId)
          .single();
          if (!offerError && offerData?.id){
            console.log(existingOffer);
             setIsEditMode(true);
             setExistingOffer(offerData);
             setOfferHotels(offerData.hotels || []);
          }
        }
        
        // Get request details
        const { data, error } = await supabase
          .from('travel_requests_agent')
          .select('*')
          .eq('id', requestId)
          .single();
          
        if (error) throw error;
        
        setRequest(data);
      } catch (error) {
        console.error('Error fetching data:', error);
        showAlert(
          t('AgentTravelRequestDetailsScreen', 'error'), 
          t('AgentTravelRequestDetailsScreen', 'failedToLoadProfileData'),
          [
            { text: t('AgentTravelRequestDetailsScreen', 'tryAgain'), onPress: () => {
              setTimeout(() => fetchData(), 100);
            } },
            { text: t('AgentTravelRequestDetailsScreen', 'cancel'), style: 'cancel' }
          ]
        );
        return;
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [requestId, offerId,navigation]);

  const toggleRequestSection = () => {
    setRequestSectionCollapsed(!requestSectionCollapsed);
  };
  
  const toggleHotelsSection = () => {
    setHotelsSectionCollapsed(!hotelsSectionCollapsed);
  };
  const shareRequest = async () => {
  if (!request) return;
  
  try {
     const requestUrl = `https://alghorfa.net/travel-request/${requestId}`;
     const simpleText = `${t('AgentTravelRequestDetailsScreen', 'travelRequestLabel')} ${request.country_name}, ${request.area_name}
${t('AgentTravelRequestDetailsScreen', 'travelers')}: ${request.adults} ${t('AgentTravelRequestDetailsScreen', 'adults')}${request.children?.length > 0 ? `, ${request.children.length} ${t('AgentTravelRequestDetailsScreen', 'children')}` : ''}
${t('AgentTravelRequestDetailsScreen', 'budgetLabel')} $${request.min_budget} - $${request.max_budget}

${requestUrl}`;


    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Share.share({
        message: simpleText,
        title: t('AgentTravelRequestDetailsScreen', 'travelRequestTitle'),
        url: requestUrl,
      });
    } else if (Platform.OS === 'web' && navigator.share) {
      await navigator.share({
        title: t('AgentTravelRequestDetailsScreen', 'travelRequestTitle'),
        text: simpleText,
        url: requestUrl,
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(simpleText);
      showAlert(
        t('AgentTravelRequestDetailsScreen', 'success'), 
        t('AgentTravelRequestDetailsScreen', 'requestCopiedToClipboard')
      );
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error sharing:', error);
      showAlert(
        t('AgentTravelRequestDetailsScreen', 'error'), 
        t('AgentTravelRequestDetailsScreen', 'failedToShareRequest')
      );
    }
  }
};
  const startEditingHotel = (index) => {
    const hotel = offerHotels[index];
    setHotelName(hotel.name);
    setHotelAddress(hotel.address);
    setHotelRooms(hotel.rooms.toString());
    setHotelRoomSize(hotel.room_size.toString());
    setHotelRating(hotel.rating);
    setHotelCost(hotel.cost.toString());
    setHotelNotes(hotel.notes || '');
    
    // Set meals
    const meals = {
      breakfast: hotel.meals.includes('breakfast'),
      lunch: hotel.meals.includes('lunch'),
      dinner: hotel.meals.includes('dinner')
    };
    setSelectedMeals(meals);
    
    setEditingHotelIndex(index);
    setAddHotelSectionCollapsed(false);
  };

  const cancelEditingHotel = () => {
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
    setEditingHotelIndex(-1);
    setAddHotelSectionCollapsed(true);
  };

  const updateHotel = () => {
    // Validate inputs
    if (!hotelName || !hotelAddress || !hotelRooms || !hotelRoomSize || 
        hotelRating === null || !hotelCost) {
      showAlert(
        t('AgentTravelRequestDetailsScreen', 'missingInformation'), 
        t('AgentTravelRequestDetailsScreen', 'fillAllRequiredFields')
      );
      return;
    }
    
    // Create meals array
    const meals = [];
    if (selectedMeals.breakfast) meals.push('breakfast');
    if (selectedMeals.lunch) meals.push('lunch');
    if (selectedMeals.dinner) meals.push('dinner');
    
    // Create updated hotel object
    const updatedHotel = {
      name: hotelName,
      address: hotelAddress,
      rooms: parseInt(hotelRooms),
      room_size: parseInt(hotelRoomSize),
      rating: hotelRating,
      meals: meals,
      notes: hotelNotes,
      cost: parseFloat(hotelCost)
    };
    
    // Update hotels array
    const updatedHotels = [...offerHotels];
    updatedHotels[editingHotelIndex] = updatedHotel;
    setOfferHotels(updatedHotels);
    
    // Reset form and exit edit mode
    cancelEditingHotel();
  };

  const addHotel = () => {
    if (offerHotels.length >= MAXIMUM_HOTELS) {
      showAlert(
        t('AgentTravelRequestDetailsScreen', 'limitReached'),
        t('AgentTravelRequestDetailsScreen', 'limitReachedMessage', { maxHotels: MAXIMUM_HOTELS })
      );
      return;
    }
    
    // Validate inputs
    if (!hotelName || !hotelAddress || !hotelRooms || !hotelRoomSize || 
        hotelRating === null || !hotelCost) {
      showAlert(
        t('AgentTravelRequestDetailsScreen', 'missingInformation'), 
        t('AgentTravelRequestDetailsScreen', 'fillAllRequiredFields')
      );
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

  const deleteHotel = (hotelIndex) => {
    const updatedHotels = offerHotels.filter((_, index) => index !== hotelIndex);
    setOfferHotels(updatedHotels);
    
    // If we were editing this hotel, cancel the edit
    if (editingHotelIndex === hotelIndex) {
      cancelEditingHotel();
    } else if (editingHotelIndex > hotelIndex) {
      // Adjust editing index if necessary
      setEditingHotelIndex(editingHotelIndex - 1);
    }
  };

  const makeOffer = async () => {
    if (offerHotels.length === 0) {
      showAlert(
        t('AgentTravelRequestDetailsScreen', 'noHotels'), 
        t('AgentTravelRequestDetailsScreen', 'addAtLeastOneHotel')
      );
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
      
      const user= await getCurrentUser();
      if(!user) {
        showAlert(
          t('AgentTravelRequestDetailsScreen', 'error'), 
          t('AgentTravelRequestDetailsScreen', 'userNotFound')
        );
        await signOut(navigation);
        return;
      }
      if(user?.app_metadata?.permitted_to_work === false) {
        showAlert(
          t('AgentTravelRequestDetailsScreen', 'accessDenied'), 
          t('AgentTravelRequestDetailsScreen', 'accessDeniedOffer')
        );
        return;

      }
      if(! inDateReq(request)) {
        showAlert(
          t('AgentTravelRequestDetailsScreen', 'requestOutdated'), 
          t('AgentTravelRequestDetailsScreen', 'requestNoLongerValid')
        );
        return;
      }
      if (isEditMode && existingOffer) {
        // Update existing offer
        
        const { data, error } = await supabase
          .from('offers')
          .update({
            min_cost: minCost,
            max_cost: maxCost,
            min_rating: minRating,
            max_rating: maxRating,
            num_of_hotels: offerHotels.length,
            hotels: offerHotels,
            new_update:true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOffer.id);
        
        if (error) throw error;
        
        showAlert(
          t('AgentTravelRequestDetailsScreen', 'success'), 
          t('AgentTravelRequestDetailsScreen', 'offerUpdatedSuccessfully'),
          [{ text: t('AgentTravelRequestDetailsScreen', 'ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        // Insert new offer into database
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
        
        showAlert(
          t('AgentTravelRequestDetailsScreen', 'success'), 
          t('AgentTravelRequestDetailsScreen', 'offerSubmittedSuccessfully'),
          [{ text: t('AgentTravelRequestDetailsScreen', 'ok'), onPress: () => navigation.navigate('Home') }]
        );
      }
    } catch (error) {
      console.error('Error making offer:', error);
      showAlert(
        t('AgentTravelRequestDetailsScreen', 'error'), 
        t('AgentTravelRequestDetailsScreen', 'failedToSubmitOffer')
      );
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
                          (isEditMode || request?.offers_number < MAXIMUM_OFFERS)
                          && (request && inDateReq(request));
  

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 40}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Request Section */}
        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
          <TouchableOpacity 
            style={[styles.sectionHeader, styles.headerTitleContainer]} 
            onPress={toggleRequestSection}
          >
            <Text style={styles.sectionTitle}>{t('AgentTravelRequestDetailsScreen', 'requestDetails')}</Text>
            <Icon 
              name={requestSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
              type="ionicon" 
            />
          </TouchableOpacity>
          {(Platform.OS !== 'web' || true) && (
    <TouchableOpacity 
      style={styles.shareIconContainer}
      onPress={shareRequest}
    >
     <Icon 
  name="share-social-outline" 
  type="ionicon" 
  color="#007bff" 
  size={24}
/>
        </TouchableOpacity>
  )}
          </View>
          {!requestSectionCollapsed && request && (
            <View style={styles.sectionContent}>
              {/* Dates */}
              <View style={styles.infoRow}>
                <View style={styles.infoColumn}>
                  <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'destination')}</Text>
                  <Text>{request.country_name} , {request.area_name}</Text>
                </View>
              </View>
             
              {/* Travelers */}
              <View style={styles.infoRow}>
                <View style={styles.fullWidth}>
                  <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'travelers')}</Text>
                  <Text>{t('AgentTravelRequestDetailsScreen', 'adults')} {request.adults}</Text>
                  {request.children && request.children > 0 ? (
                    <View>
                      <Text>{t('AgentTravelRequestDetailsScreen', 'children')} {request.children.length}</Text>
                      {request.children && (
                        <View style={styles.childrenAges}>
                        <Text>{t('AgentTravelRequestDetailsScreen', 'ages')} {request.children.join(', ')} {t('AgentTravelRequestDetailsScreen', 'years')}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text>{t('AgentTravelRequestDetailsScreen', 'noChildren')}</Text>
                  )}
                </View>
                {/* travelers nationality */}
              </View>
              <View style={styles.infoRow}>
                <View style={styles.fullWidth}>
                  <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'nationality')}</Text>
                  <Text>{request.travelers_nationality_name}</Text>
                </View>
              </View>
              {/* Hotels Info */}
              <View style={styles.infoRow}>
                <View style={styles.fullWidth}>
                  <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'hotelInformation')}</Text>
                  <Text>{t('AgentTravelRequestDetailsScreen', 'rating')} {request.hotel_rating} {t('AgentTravelRequestDetailsScreen', 'stars')}</Text>
                  <Text>{t('AgentTravelRequestDetailsScreen', 'rooms')} {request.rooms} {t('AgentTravelRequestDetailsScreen', 'roomsUnit')}</Text>
                  <Text>{t('AgentTravelRequestDetailsScreen', 'meals')} {request.meals?.join(', ') || t('AgentTravelRequestDetailsScreen', 'none')}</Text>
                </View>
              </View>
              
              {/* Budget */}
              <View style={styles.infoRow}>
                <View style={styles.infoColumn}>
                  <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'minBudget')}</Text>
                  <Text>${request.min_budget}</Text>
                </View>
                <View style={styles.infoColumn}>
                  <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'maxBudget')}</Text>
                  <Text>${request.max_budget}</Text>
                </View>
              </View>
              
              {/* Notes */}
              <View style={styles.infoRow}>
                <View style={styles.fullWidth}>
                  <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'notes')}</Text>
                  <ScrollView style={styles.notesContainer}>
                    <Text>{request.notes || t('AgentTravelRequestDetailsScreen', 'noNotesProvided')}</Text>
                  </ScrollView>
                </View>
              </View>
            </View>
          )}
        </Card>
        
        {/* Warning Section */}
        {!isEditMode && request && inDateReq(request) && request?.offers_number >= MAXIMUM_OFFERS && (
          <Card containerStyle={styles.warningCard}>
            <Text style={styles.warningText}>
              {t('AgentTravelRequestDetailsScreen', 'maximumOffersReached', { maxOffers: MAXIMUM_OFFERS })}
            </Text>
          </Card>
        )}
        
        {/* Not Permitted Warning */}
        {!isPermittedToWork && (
          <Card containerStyle={styles.warningCard}>
            <Text style={styles.warningText}>
              {t('AgentTravelRequestDetailsScreen', 'notPermittedToWork')}
            </Text>
          </Card>
        )}
        
        {/* Offers Info Section */}
        {offerHotels.length > 0 && (
          <Card containerStyle={styles.card}>
            <Text style={styles.sectionTitle}>{t('AgentTravelRequestDetailsScreen', 'offerSummary')}</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'minCost')}</Text>
                <Text>${minCost}</Text>
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'maxCost')}</Text>
                <Text>${maxCost}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'minRating')}</Text>
                <Text>{minRating} {t('AgentTravelRequestDetailsScreen', 'stars')}</Text>
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'maxRating')}</Text>
                <Text>{maxRating} {t('AgentTravelRequestDetailsScreen', 'stars')}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'numberOfHotels')}</Text>
                <Text>{offerHotels.length}</Text>
              </View>
              <View style={styles.infoColumn}>
                {userCanMakeOffer && (
                  <Button
                    title={isEditMode ? t('AgentTravelRequestDetailsScreen', 'updateOffer') : t('AgentTravelRequestDetailsScreen', 'makeOffer')}
                    onPress={makeOffer}
                    buttonStyle={styles.makeOfferButton}
                  />
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Add/Edit Hotel Section - Collapsible */}
        {userCanMakeOffer && (
          <Card containerStyle={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader} 
              onPress={() => setAddHotelSectionCollapsed(!addHotelSectionCollapsed)}
            >
              <Text style={styles.sectionTitle}>
                {editingHotelIndex >= 0 ? t('AgentTravelRequestDetailsScreen', 'editHotel') : t('AgentTravelRequestDetailsScreen', 'addHotelToOffer')}
              </Text>
              <Icon 
                name={addHotelSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
                type="ionicon" 
              />
            </TouchableOpacity>
            
            {!addHotelSectionCollapsed && (
              <View style={styles.sectionContent}>
                {/* Hotel Form */}
                <Input
                  label={t('AgentTravelRequestDetailsScreen', 'hotelName')}
                  value={hotelName}
                  onChangeText={setHotelName}
                />
                <Input
                  label={t('AgentTravelRequestDetailsScreen', 'hotelAddress')}
                  value={hotelAddress}
                  onChangeText={setHotelAddress}
                />
                <Input
                  label={t('AgentTravelRequestDetailsScreen', 'numberOfRooms')}
                  value={hotelRooms}
                  onChangeText={setHotelRooms}
                  keyboardType="numeric"
                />
                <Input
                  label={t('AgentTravelRequestDetailsScreen', 'roomSizeInMeter')}
                  value={hotelRoomSize}
                  onChangeText={setHotelRoomSize}
                  keyboardType="numeric"
                />
                
                {/* Rating and Cost in same row */}
                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.dropdownLabel}>{t('AgentTravelRequestDetailsScreen', 'hotelRating')}</Text>
                    <Dropdown
                      style={styles.dropdown}
                      data={ratingData}
                      labelField="label"
                      valueField="value"
                      value={hotelRating}
                      onChange={item => setHotelRating(item.value)}
                      placeholder={t('AgentTravelRequestDetailsScreen', 'selectRating')}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.dropdownLabel}>{t('AgentTravelRequestDetailsScreen', 'totalCostInDollars')}</Text>
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
                  label={t('AgentTravelRequestDetailsScreen', 'notesLabel')}
                  value={hotelNotes}
                  onChangeText={setHotelNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  inputContainerStyle={styles.notesInputContainer}
                  inputStyle={styles.notesInput}
                />
                
                {/* Meals in one row */}
                <Text style={styles.mealsLabel}>{t('AgentTravelRequestDetailsScreen', 'mealsLabel')}</Text>
                <View style={styles.mealsContainer}>
                  <CheckBox
                    title={t('AgentTravelRequestDetailsScreen', 'breakfast')}
                    checked={selectedMeals.breakfast}
                    onPress={() => setSelectedMeals({ ...selectedMeals, breakfast: !selectedMeals.breakfast })}
                    containerStyle={styles.mealCheckbox}
                  />
                  <CheckBox
                    title={t('AgentTravelRequestDetailsScreen', 'lunch')}
                    checked={selectedMeals.lunch}
                    onPress={() => setSelectedMeals({ ...selectedMeals, lunch: !selectedMeals.lunch })}
                    containerStyle={styles.mealCheckbox}
                  />
                  <CheckBox
                    title={t('AgentTravelRequestDetailsScreen', 'dinner')}
                    checked={selectedMeals.dinner}
                    onPress={() => setSelectedMeals({ ...selectedMeals, dinner: !selectedMeals.dinner })}
                    containerStyle={styles.mealCheckbox}
                  />
                </View>
                
                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                  {editingHotelIndex >= 0 ? (
                    <>
                      <Button
                        title={t('AgentTravelRequestDetailsScreen', 'updateHotel')}
                        onPress={updateHotel}
                        buttonStyle={[styles.addButton, { backgroundColor: '#007bff' }]}
                        containerStyle={styles.buttonContainer}
                      />
                      <Button
                        title={t('AgentTravelRequestDetailsScreen', 'cancel')}
                        onPress={cancelEditingHotel}
                        buttonStyle={[styles.addButton, { backgroundColor: '#6c757d' }]}
                        containerStyle={styles.buttonContainer}
                      />
                    </>
                  ) : (
                    <Button
                      title={t('AgentTravelRequestDetailsScreen', 'addHotel')}
                      onPress={addHotel}
                      buttonStyle={styles.addButton}
                      containerStyle={styles.buttonContainer}
                    />
                  )}
                </View>
              </View>
            )}
          </Card>
        )}
        
        {/* Hotels Section - Now showing as editable forms */}
        {offerHotels.length > 0 && (
          <Card containerStyle={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader} 
              onPress={toggleHotelsSection}
            >
              <Text style={styles.sectionTitle}>
                {isEditMode ? t('AgentTravelRequestDetailsScreen', 'currentHotelsInOffer') : t('AgentTravelRequestDetailsScreen', 'addedHotels')}
              </Text>
              <Icon 
                name={hotelsSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
                type="ionicon" 
              />
            </TouchableOpacity>
            
            {hotelsSectionCollapsed && offerHotels.map((hotel, index) => (
              <Card key={index} containerStyle={styles.hotelItemCard}>
                <View style={styles.hotelHeader}>
                  <Text style={styles.hotelName}>{hotel.name}</Text>
                  <View style={styles.hotelActions}>
                    {userCanMakeOffer && (
                      <TouchableOpacity 
                        onPress={() => startEditingHotel(index)}
                        style={styles.editIconContainer}
                      >
                        <Icon name="pencil" type="ionicon" color="#007bff" size={20} />
                      </TouchableOpacity>
                    )}
                    {userCanMakeOffer && (
                      <TouchableOpacity 
                        onPress={() => deleteHotel(index)}
                        style={styles.deleteIconContainer}
                      >
                        <Icon name="trash-outline" type="ionicon" color="#dc3545" size={20} />
                      </TouchableOpacity>
                    )}
                  </View>
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
                      {hotel.rooms} {hotel.rooms === 1 ? t('AgentTravelRequestDetailsScreen', 'room') : t('AgentTravelRequestDetailsScreen', 'roomsUnit')}, {hotel.room_size} {t('AgentTravelRequestDetailsScreen', 'metersSquared')}
                    </Text>
                  </View>
                  
                  <View style={styles.hotelDetailRow}>
                    <Icon name="star" type="ionicon" size={16} color="#FFD700" />
                    <Text style={styles.hotelDetailText}>{hotel.rating} {t('AgentTravelRequestDetailsScreen', 'stars')}</Text>
                  </View>
                  
                  <View style={styles.hotelDetailRow}>
                    <Icon name="restaurant-outline" type="ionicon" size={16} color="#007bff" />
                    <Text style={styles.hotelDetailText}>
                      {t('AgentTravelRequestDetailsScreen', 'mealsColon')} {hotel.meals.length > 0 ? hotel.meals.join(', ') : t('AgentTravelRequestDetailsScreen', 'none')}
                    </Text>
                  </View>
                  
                  <View style={styles.hotelDetailRow}>
                    <Icon name="cash-outline" type="ionicon" size={16} color="#28a745" />
                    <Text style={styles.hotelDetailText}>{t('AgentTravelRequestDetailsScreen', 'totalCost')} ${hotel.cost}</Text>
                  </View>
                  
                  {hotel.notes && (
                    <View style={styles.hotelDetailRow}>
                      <Icon name="document-text-outline" type="ionicon" size={16} color="#007bff" />
                      <Text style={styles.hotelDetailText}>{t('AgentTravelRequestDetailsScreen', 'notesColon')} {hotel.notes}</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  childrenAges: {
    marginTop: 5,
    paddingLeft: 2,
  },
  notesContainer: {
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  makeOfferButton: {
    backgroundColor: '#28a745',
    borderRadius: 5,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal:10,
    marginBottom: 10,
  },
  halfWidth: {
    flex: 0.48,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#86939e',
    marginBottom: 5,
    marginLeft: 10,
  },
  dropdown: {
    height: 50,
    borderColor: '#86939e',
    borderWidth: 0.5,
    borderRadius: 5,
    paddingHorizontal: 8,
     marginBottom: 15,
    marginHorizontal: 10,
    
  },
  inputContainer: {
    paddingHorizontal: 0,
    height:50,
  },
  inputInnerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#86939e',
  },
  notesInputContainer: {
     borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  paddingHorizontal: 8,
  maxHeight: 150,
  },
  notesInput: {
    textAlignVertical: 'top',
    minHeight: 100,
    paddingTop:8,
  },
  mealsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#86939e',
    marginBottom: 10,
    marginLeft: 10,
  },
  mealsContainer: {
    flexDirection: 'row',
    flexWrap:'wrap',
    justifyContent: 'space-between',
    marginHorizontal:10,
    marginBottom: 15,
  },
  mealCheckbox: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    width: '30%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  addButton: {
    backgroundColor: '#28a745',
    borderRadius: 5,
    paddingVertical: 12,
  },
  hotelItemCard: {
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  hotelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  hotelActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIconContainer: {
    padding: 8,
    marginRight: 5,
  },
  deleteIconContainer: {
    padding: 8,
  },
  hotelDivider: {
    backgroundColor: '#e1e8ed',
    height: 1,
    marginVertical: 10,
  },
  hotelDetailsContainer: {
    paddingTop: 5,
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
  headerTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
shareIconContainer: {
  padding: 8,
  marginLeft: 10,
},
});
export default AgentTravelRequestDetailsScreen; 
