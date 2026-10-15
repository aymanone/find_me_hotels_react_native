import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { 
  Text, 
  Button, 
  Icon, 
  Card, 
  Input 
} from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import {MAXIMUM_OFFERS, MAXIMUM_HOTELS} from '../config/CONSTANTS';
import {outDatedReq} from '../utils/dateUtils';
import { checkUserRole } from '../utils/auth';
import { getCurrentUser,signOut } from '../utils/auth';
import {inDateReq} from '../utils/dateUtils';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, screenSize, responsive } from '../styles/theme';
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
  const [hotelRoomType, setHotelRoomType] = useState('');
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
  const [offerSummaryCollapsed, setOfferSummaryCollapsed] = useState(false);
  const [editingHotelIndex, setEditingHotelIndex] = useState(-1); // Track which hotel is being edited
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);
  const formY = useRef(0);
  
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
  const toggleOfferSummarySection = () => {
  setOfferSummaryCollapsed(!offerSummaryCollapsed);
};
  const formatDate = (timestamptz) => {
  if (!timestamptz) return t('AgentTravelRequestDetailsScreen', 'notAvailable');
  return new Date(timestamptz).toLocaleDateString('en-US', {
        month: '2-digit',
        day: 'numeric', 
        year: 'numeric'
      });
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
    setHotelRoomType(hotel.room_type || '');
    setHotelRating(hotel.rating);
    setHotelCost(Math.round(hotel.cost).toString());
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
    scrollRef.current?.scrollTo({ y: formY.current, animated: true });
  };

  const cancelEditingHotel = () => {
    // Reset form
    setHotelName('');
    setHotelAddress('');
    setHotelRooms('');
    setHotelRoomType('');
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
  const validateHotelForm = () => {
  if (!hotelName.trim() || !hotelAddress.trim() || !hotelRoomType.trim() || hotelRating === null ) {
    return t('AgentTravelRequestDetailsScreen', 'fillAllRequiredFields');
  }
 
  if (!/^\d+$/.test(hotelRooms.trim()) || parseInt(hotelRooms, 10) < 1) {
    return t('AgentTravelRequestDetailsScreen', 'invalidRooms');
  }
  
  if (!/^\d+$/.test(hotelCost.trim()) || parseInt(hotelCost, 10) < 1) {
    return t('AgentTravelRequestDetailsScreen', 'invalidCost');
  }
  return null;
};
  const updateHotel = () => {
    // Validate inputs
   const validationError = validateHotelForm();
if (validationError) {
  showAlert(t('AgentTravelRequestDetailsScreen', 'missingInformation'), validationError);
  return;
}
    
    // Create meals array
    const meals = [];
    if (selectedMeals.breakfast) meals.push('breakfast');
    if (selectedMeals.lunch) meals.push('lunch');
    if (selectedMeals.dinner) meals.push('dinner');
    
    // Create updated hotel object
    const updatedHotel = {
      name: hotelName.trim(),
      address: hotelAddress.trim(),
      rooms: parseInt(hotelRooms,10),
      room_type: hotelRoomType.trim(),
      rating: hotelRating,
      meals: meals,
      notes: hotelNotes,
      cost: parseInt(hotelCost,10)
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
     const validationError = validateHotelForm();
if (validationError) {
  showAlert(t('AgentTravelRequestDetailsScreen', 'missingInformation'), validationError);
  return;
}
    
    // Create meals array
    const meals = [];
    if (selectedMeals.breakfast) meals.push('breakfast');
    if (selectedMeals.lunch) meals.push('lunch');
    if (selectedMeals.dinner) meals.push('dinner');
    
    // Create new hotel object
    const newHotel = {
      name: hotelName.trim(),
      address: hotelAddress.trim(),
      rooms: parseInt(hotelRooms,10),
      room_type: hotelRoomType.trim(),
      rating: hotelRating,
      meals: meals,
      notes: hotelNotes,
      cost: parseInt(hotelCost,10)
    };
    
    // Add to hotels array
    setOfferHotels([...offerHotels, newHotel]);
    
    // Reset form
    setHotelName('');
    setHotelAddress('');
    setHotelRooms('');
    setHotelRoomType('');
    setHotelRating(null);
    setHotelCost('');
    setHotelNotes('');
    setSelectedMeals({
      breakfast: false,
      lunch: false,
      dinner: false
    });
      setAddHotelSectionCollapsed(true);
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
      setSubmitting(true);
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
            updated_at: new Date().toISOString(),
            start_date: request.start_date ? new Date(request.start_date).toISOString() : null,
            end_date: request.end_date ? new Date(request.end_date).toISOString() : null,
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
            request_creator: request.creator_id,
            start_date: request.start_date ? new Date(request.start_date).toISOString() : null,
            end_date: request.end_date ? new Date(request.end_date).toISOString() : null,
  
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
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary}  />
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

  // Shared props so every text field looks and aligns the same
  const inputProps = {
    containerStyle: styles.fieldContainer,
    inputContainerStyle: styles.fieldBox,
    inputStyle: commonStyles.inputStyle,
    labelStyle: styles.fieldLabel,
    renderErrorMessage: false,
  };
  

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 40}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 50 }}
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
              size={theme.responsiveComponents.icon.medium}
              color={theme.colors.primary}
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
  color={theme.colors.primary} 
  size={theme.responsiveComponents.icon.large}
/>
        </TouchableOpacity>
  )}
          </View>
          {!requestSectionCollapsed && request && (
            <View style={styles.sectionContent}>
              {/* Destination */}
              <View style={styles.infoRow}>
                <View style={styles.infoColumn}>
                  <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'destination')}</Text>
                  <Text>{request.country_name} , {request.area_name}</Text>
                </View>
              </View>
             {/* Travel Dates */}
          <View style={styles.infoRow}>
         <View style={styles.infoColumn}>
         <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'startDate')}</Text>
             <Text>{formatDate(request.start_date)}</Text>
            </View>
         <View style={styles.infoColumn}>
        <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'endDate')}</Text>
         <Text>{formatDate(request.end_date)}</Text>
          </View>
         </View>
              {/* Travelers */}
              <View style={styles.infoRow}>
                <View style={styles.fullWidth}>
                  <Text style={styles.label}>{t('AgentTravelRequestDetailsScreen', 'travelers')}</Text>
                  <Text>{t('AgentTravelRequestDetailsScreen', 'adults')} {request.adults}</Text>
                {request.children && request.children.length > 0 ? (
              <View>
                    <Text>{t('AgentTravelRequestDetailsScreen', 'children')} {request.children.length}</Text>
                 <View style={styles.childrenAges}>
                <Text>{t('AgentTravelRequestDetailsScreen', 'ages')} {request.children.join(', ')} {t('AgentTravelRequestDetailsScreen', 'years')}</Text>
              </View>
          </View>
        ) : (
            <Text>{t('AgentTravelRequestDetailsScreen', 'noChildren')}</Text>
            )
             }
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
                  <Text>{t('AgentTravelRequestDetailsScreen', 'meals')} {request.meals?.length ? request.meals.map((m) => t('AgentTravelRequestDetailsScreen', m)).join(', ') : t('AgentTravelRequestDetailsScreen', 'none')}</Text>
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
        
        {/* Offer Summary Section */}
        {offerHotels.length > 0 && (
          <Card containerStyle={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader} 
              onPress={toggleOfferSummarySection}
            >
              <Text style={styles.sectionTitle}>{t('AgentTravelRequestDetailsScreen', 'offerSummary')}</Text>
              <Icon 
                name={offerSummaryCollapsed ? 'chevron-down' : 'chevron-up'} 
                type="ionicon" 
                size={theme.responsiveComponents.icon.medium}
                color={theme.colors.primary}
              />
            </TouchableOpacity>

            {offerSummaryCollapsed ? (
              <Text style={styles.summaryOneLiner}>
                {t('AgentTravelRequestDetailsScreen', 'numberOfHotels')}: {offerHotels.length} · ${minCost} – ${maxCost}
              </Text>
            ) : (
              <View style={styles.sectionContent}>
                               {existingOffer && (
                  <View style={styles.summaryDates}>
                    <Icon
                      name="calendar-outline"
                      type="ionicon"
                      size={theme.responsiveComponents.icon.small}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.summaryDatesText}>
                      {formatDate(existingOffer.start_date)} – {formatDate(existingOffer.end_date)}
                    </Text>
                  </View>
                )}

                <View style={styles.statsRow}>
                  <View style={styles.statTile}>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>${minCost}</Text>
                    <Text style={styles.statLabel}>{t('AgentTravelRequestDetailsScreen', 'minCost')}</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>${maxCost}</Text>
                    <Text style={styles.statLabel}>{t('AgentTravelRequestDetailsScreen', 'maxCost')}</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                      {minRating} {t('AgentTravelRequestDetailsScreen', 'stars')}
                    </Text>
                    <Text style={styles.statLabel}>{t('AgentTravelRequestDetailsScreen', 'minRating')}</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                      {maxRating} {t('AgentTravelRequestDetailsScreen', 'stars')}
                    </Text>
                    <Text style={styles.statLabel}>{t('AgentTravelRequestDetailsScreen', 'maxRating')}</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={styles.statValue}>{offerHotels.length}</Text>
                    <Text style={styles.statLabel}>{t('AgentTravelRequestDetailsScreen', 'numberOfHotels')}</Text>
                  </View>
                </View>
              </View>
            )}

            {userCanMakeOffer && (
              <>
                <View style={commonStyles.divider} />
                <Button
                  title={isEditMode ? t('AgentTravelRequestDetailsScreen', 'updateOffer') : t('AgentTravelRequestDetailsScreen', 'makeOffer')}
                  onPress={makeOffer}
                  loading={submitting}
                  disabled={submitting}
                  icon={{
                    name: 'checkmark-circle-outline',
                    type: 'ionicon',
                    size: theme.responsiveComponents.icon.medium,
                    color: theme.colors.textWhite,
                  }}
                  buttonStyle={styles.makeOfferButton}
                  titleStyle={styles.makeOfferTitle}
                  disabledStyle={styles.makeOfferDisabled}
                />
              </>
            )}
          </Card>
        )}

        {/* Hotels Section */}
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
                size={theme.responsiveComponents.icon.medium}
                color={theme.colors.primary}
              />
            </TouchableOpacity>

            {!hotelsSectionCollapsed && offerHotels.map((hotel, index) => (
              <View
                key={index}
                style={[
                  styles.hotelItemCard,
                  index === editingHotelIndex && styles.hotelItemCardEditing,
                ]}
              >
                               <View style={styles.hotelHeader}>
                  <Text style={styles.hotelName}>{hotel.name}</Text>
                  {userCanMakeOffer && (
                    <View style={styles.hotelActions}>
                      <TouchableOpacity onPress={() => startEditingHotel(index)} style={styles.iconButton}>
                        <Icon name="pencil" type="ionicon" color={theme.colors.primary} size={theme.responsiveComponents.icon.medium} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteHotel(index)} style={styles.iconButton}>
                        <Icon name="trash-outline" type="ionicon" color={theme.colors.error} size={theme.responsiveComponents.icon.medium} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.hotelDetailRow}>
                  <Icon name="cash-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.success} />
                  <Text style={[styles.hotelDetailText, styles.hotelCostText]}>${hotel.cost}</Text>
                </View>

                               <View style={styles.hotelDetailRow}>
                  <Icon name="star" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.warning} />
                  <Text style={styles.hotelDetailText}>
                    {hotel.rating} {t('AgentTravelRequestDetailsScreen', 'stars')} · {hotel.rooms} {hotel.rooms === 1 ? t('AgentTravelRequestDetailsScreen', 'room') : t('AgentTravelRequestDetailsScreen', 'roomsUnit')}
                  </Text>
                </View>

                <View style={styles.hotelDetailRow}>
                  <Icon name="location-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                  <Text style={styles.hotelDetailText}>{hotel.address}</Text>
                </View>

                {!!(hotel.room_type || hotel.room_size) && (
                  <View style={styles.hotelDetailRow}>
                    <Icon name="bed-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                    <Text style={styles.hotelDetailText}>
                      {hotel.room_type || `${hotel.room_size} ${t('AgentTravelRequestDetailsScreen', 'metersSquared')}`}
                    </Text>
                  </View>
                )}
                <View style={styles.hotelDetailRow}>
                  <Icon name="restaurant-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                  <Text style={styles.hotelDetailText}>
                     {t('AgentTravelRequestDetailsScreen', 'mealsColon')} {hotel.meals.length > 0 ? hotel.meals.map((m) => t('AgentTravelRequestDetailsScreen', m)).join(', ') : t('AgentTravelRequestDetailsScreen', 'none')}
                  </Text>
                </View>

                {!!hotel.notes && (
                  <View style={styles.hotelDetailRow}>
                    <Icon name="document-text-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                    <Text style={styles.hotelDetailText} >
                      {t('AgentTravelRequestDetailsScreen', 'notesColon')} {hotel.notes}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </Card>
        )}
        
        {/* Add/Edit Hotel Section */}
        {userCanMakeOffer && (
          <View onLayout={(e) => { formY.current = e.nativeEvent.layout.y; }}>
            <Card
              containerStyle={StyleSheet.flatten([
                styles.card,
                editingHotelIndex >= 0 && styles.cardEditing,
              ])}
            >
              <TouchableOpacity 
                style={styles.sectionHeader} 
                onPress={() => setAddHotelSectionCollapsed(!addHotelSectionCollapsed)}
              >
                <Text style={[styles.sectionTitle, styles.formTitle]} numberOfLines={1}>
                  {editingHotelIndex >= 0
                    ? `${t('AgentTravelRequestDetailsScreen', 'editHotel')}: ${offerHotels[editingHotelIndex]?.name || ''}`
                    : `${t('AgentTravelRequestDetailsScreen', 'addHotelToOffer')} (${offerHotels.length}/${MAXIMUM_HOTELS})`}
                </Text>
                <Icon 
                  name={addHotelSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
                  type="ionicon" 
                  size={theme.responsiveComponents.icon.medium}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>

              {!addHotelSectionCollapsed && (
                <View style={styles.sectionContent}>
                                   <Input
                    {...inputProps}
                    label={`${t('AgentTravelRequestDetailsScreen', 'hotelName')} *`}
                    value={hotelName}
                    onChangeText={(text) => setHotelName(text.replace(/\n/g, ' '))}
                    multiline
                    numberOfLines={2}
                    maxLength={100}
                    inputStyle={styles.roomTypeInput}
                  />
                  <Input
                    {...inputProps}
                    label={`${t('AgentTravelRequestDetailsScreen', 'hotelAddress')} *`}
                    value={hotelAddress}
                    onChangeText={(text) => setHotelAddress(text.replace(/\n/g, ' '))}
                    multiline
                    numberOfLines={2}
                    maxLength={200}
                    inputStyle={styles.roomTypeInput}
                  />

                                  {/* Room type (own line, can be long) */}
                  <Input
                    {...inputProps}
                    label={`${t('AgentTravelRequestDetailsScreen', 'roomType')} *`}
                    value={hotelRoomType}
                    onChangeText={setHotelRoomType}
                    multiline
                    numberOfLines={2}
                    maxLength={150}
                    inputStyle={styles.roomTypeInput}
                  />

                  {/* Rooms | Cost */}
                  <View style={styles.formRow}>
                    <View style={commonStyles.halfWidth}>
                      <Input
                        {...inputProps}
                        label={`${t('AgentTravelRequestDetailsScreen', 'numberOfRooms')} *`}
                        value={hotelRooms}
                        onChangeText={setHotelRooms}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={commonStyles.halfWidth}>
                      <Input
                        {...inputProps}
                        label={`${t('AgentTravelRequestDetailsScreen', 'totalCostInDollars')} *`}
                        value={hotelCost}
                        onChangeText={setHotelCost}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Rating */}
                  <Text style={styles.fieldLabel}>
                    {`${t('AgentTravelRequestDetailsScreen', 'hotelRating')} *`}
                  </Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={commonStyles.placeholderStyle}
                    selectedTextStyle={commonStyles.selectedTextStyle}
                    data={ratingData}
                    labelField="label"
                    valueField="value"
                    value={hotelRating}
                    onChange={item => setHotelRating(item.value)}
                    placeholder={t('AgentTravelRequestDetailsScreen', 'selectRating')}
                  />

                  <Input
                    {...inputProps}
                    label={t('AgentTravelRequestDetailsScreen', 'notesLabel')}
                    value={hotelNotes}
                    onChangeText={setHotelNotes}
                    multiline
                    numberOfLines={4}
                    inputContainerStyle={styles.notesBox}
                    inputStyle={styles.notesInput}
                  />

                  {/* Meals */}
                  <Text style={styles.fieldLabel}>{t('AgentTravelRequestDetailsScreen', 'mealsLabel')}</Text>
                  <View style={styles.mealsContainer}>
                    {['breakfast', 'lunch', 'dinner'].map((meal) => {
                      const on = selectedMeals[meal];
                      return (
                        <TouchableOpacity
                          key={meal}
                          onPress={() => setSelectedMeals((prev) => ({ ...prev, [meal]: !prev[meal] }))}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          style={[styles.mealChip, on && styles.mealChipOn]}
                        >
                          <Icon
                            name={on ? 'checkmark-circle' : 'ellipse-outline'}
                            type="ionicon"
                            size={theme.responsiveComponents.icon.small + 2}
                            color={on ? theme.colors.primary : theme.colors.textLight}
                          />
                          <Text style={[styles.mealChipText, on && styles.mealChipTextOn]}>
                            {t('AgentTravelRequestDetailsScreen', meal)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.buttonRow}>
                    {editingHotelIndex >= 0 ? (
                      <>
                        <Button
                          title={t('AgentTravelRequestDetailsScreen', 'updateHotel')}
                          onPress={updateHotel}
                          buttonStyle={styles.addButton}
                          containerStyle={styles.buttonContainer}
                        />
                        <Button
                          title={t('AgentTravelRequestDetailsScreen', 'cancel')}
                          type="outline"
                          onPress={cancelEditingHotel}
                          buttonStyle={styles.cancelButton}
                          titleStyle={styles.cancelTitle}
                          containerStyle={styles.buttonContainer}
                        />
                      </>
                    ) : (
                      <Button
                        title={t('AgentTravelRequestDetailsScreen', 'addHotel')}
                        onPress={addHotel}
                        icon={{
                          name: 'add-circle-outline',
                          type: 'ionicon',
                          size: theme.responsiveComponents.icon.medium,
                          color: theme.colors.textWhite,
                        }}
                        buttonStyle={styles.addButton}
                        containerStyle={styles.buttonContainer}
                      />
                    )}
                  </View>
                </View>
              )}
            </Card>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Base look for every text field, built on the theme's outlined input style
const fieldBoxBase = {
  ...commonStyles.inputContainerStyle,
  // react-native-elements sets a bottom border color of its own; match it so all 4 sides agree
  borderBottomColor: theme.colors.border,
  minHeight: theme.responsiveComponents.input.height,
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
    backgroundColor: theme.colors.background,
  },
  card: {
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.responsiveSpacing.md,
    ...theme.shadows.md,
  },
  cardEditing: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  warningCard: {
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.responsiveSpacing.md,
    backgroundColor: theme.colors.warningLight,
    borderColor: theme.colors.warningBorder,
    ...theme.shadows.sm,
  },
  warningText: {
    color: theme.colors.warningTitle,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.bold,
    fontSize: theme.responsiveTypography.fontSize.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.responsiveTypography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  formTitle: {
    flex: 1,
    marginEnd: theme.spacing.sm,
  },
  sectionContent: {
    marginTop: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: screenSize.isXSmall ? 'column' : 'row',
    marginBottom: theme.responsiveSpacing.md,
  },
  infoColumn: {
    flex: 1,
    marginBottom: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  fullWidth: {
    flex: 2,
  },
  label: {
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.text,
  },
  childrenAges: {
    marginTop: theme.spacing.xs,
    paddingStart: 2,
  },
  notesContainer: {
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundGray,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shareIconContainer: {
    padding: theme.spacing.sm,
    marginStart: theme.spacing.sm,
  },

  // ---- Offer summary ----
  summaryOneLiner: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  summaryDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  summaryDatesText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.responsiveTypography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  makeOfferButton: {
    backgroundColor: theme.colors.secondaryDark,
    borderRadius: theme.borderRadius.md,
    height: theme.responsiveComponents.button.height,
  },
  makeOfferTitle: {
    fontWeight: theme.typography.fontWeight.semibold,
  },
  makeOfferDisabled: {
    backgroundColor: theme.colors.disabled,
  },

  // ---- Hotel form ----
  fieldContainer: {
    paddingHorizontal: 0,
    marginBottom: theme.spacing.md,
  },
  fieldBox: {
    ...fieldBoxBase,
  },
  fieldLabel: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  unitText: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  unitIcon: {
    marginHorizontal: theme.spacing.sm,
    marginVertical: 0,
  },
  formRow: {
    ...commonStyles.responsiveRow,
    marginBottom: 0,
  },
  dropdown: {
    ...commonStyles.dropdown,
    height: theme.responsiveComponents.input.height,
    marginBottom: theme.spacing.md,
  },
  notesBox: {
    ...fieldBoxBase,
    minHeight: 100,
    maxHeight: 150,
    alignItems: 'flex-start',
  },
  notesInput: {
    textAlignVertical: 'top',
    minHeight: 100,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    fontSize: theme.responsiveTypography.fontSize.md,
  },
  mealsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.components.tag.paddingVertical + 2,
    paddingHorizontal: theme.responsiveComponents.tag.paddingHorizontal,
    borderRadius: theme.components.tag.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundWhite,
  },
  mealChipOn: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  mealChipText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  mealChipTextOn: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  buttonRow: {
    flexDirection: screenSize.isXSmall ? 'column' : 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.sm,
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    marginBottom: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: theme.responsiveComponents.button.height,
  },
  cancelButton: {
    borderColor: theme.colors.borderDark,
    borderRadius: theme.borderRadius.md,
    height: theme.responsiveComponents.button.height,
  },
  cancelTitle: {
    color: theme.colors.textSecondary,
  },

  // ---- Hotel list ----
  hotelItemCard: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundWhite,
  },
  hotelItemCardEditing: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  hotelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  hotelName: {
    fontSize: theme.responsiveTypography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    flex: 1,
    marginEnd: theme.spacing.sm,
  },
  hotelCost: {
    fontSize: theme.responsiveTypography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
    marginEnd: theme.spacing.xs,
  },
  hotelActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: theme.spacing.md,
  },
  hotelDetailRow: {
    flexDirection: 'row',
    alignItems:  'flex-start',
    marginBottom: theme.spacing.sm,
  },
  hotelDetailText: {
    marginStart: theme.spacing.sm,
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.text,
    flex: 1,
  },
    roomTypeInput: {
    ...commonStyles.inputStyle,
    minHeight: 60,
    textAlignVertical: 'top',
  },
    hotelCostText: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
    fontSize: theme.responsiveTypography.fontSize.md,
  },
});
export default AgentTravelRequestDetailsScreen;
