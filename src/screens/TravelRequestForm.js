import { View, StyleSheet, ScrollView, Platform, Alert ,KeyboardAvoidingView} from 'react-native';
import React, { useState, useEffect ,useRef} from 'react';
import supabase from '../config/supabase';
import { Button, Input, Text, CheckBox } from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { checkUserRole, getCurrentUser,signOut} from '../utils/auth';
import { removeFirstOccurrence } from '../utils/arrayUtils';  
import {showAlert} from "../components/ShowAlert";
import {unsubscribeChannels} from '../utils/channelUtils.js'; // Import the unsubscribe function

export default function TravelRequestForm({ navigation, route }) {
  // Check if we're editing an existing request
 

  // Check if user is client
  useEffect(() => {
    checkUserRole("client", navigation, "Signin");
  }, [navigation]);

  // State variables
  const channelsRef=useRef([]);
  const [isEditing, setIsEditing] = useState(!!route?.params?.requestId);
  const [requestId, setRequestId] = useState(route?.params?.requestId);
  const [allCountries, setAllCountries] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // References to dropdowns for resetting
  const countryDropdownRef = useRef(null);
  const areaDropdownRef = useRef(null);
  const nationalityDropdownRef = useRef(null);
  const preferredAgentsDropdownRef = useRef(null);
  
  // Form data
  const [formData, setFormData] = useState({
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    requestCountry: null,
    requestArea: null,
    numOfAdults: '1',
    requestChildren: [],
    hotelRating: null,
    numOfRooms: '1',
    meals: [],
    minBudget: '',
    maxBudget: '',
    travelersNationality: null,
    preferredAgentsCountries: [],
    notes: ''
  });

  // Prepare data for dropdowns
  const hotelRatings = Array.from({ length: 8 }, (_, i) => ({
    label: `${i} stars`,
    value: i
  }));

  const allChildrenAges = Array.from({ length: 18 }, (_, i) => ({
    label: `${i} years`,
    value: i
  }));
  const resetForm = ()=>{
         setIsEditing(false);
         setRequestId(null);
  }
  // Fetch existing request data when editing
  useEffect(() => {
    const fetchRequestData = async () => {
      if (!isEditing) return;
      
      try {
        setInitialLoading(true);
        const user = await getCurrentUser();
        if (!user) {
          showAlert('Error', 'User not found. Please log in again.');
          await signOut(navigation);
          return;
        }

        const { data: request, error } = await supabase
          .from('travel_requests')
          .select('*')
          .eq('id', requestId)
          .eq('creator_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            showAlert('Error', 'Request not found or you do not have permission to edit it.');
            navigation.goBack();
          } else {
                       showAlert(
      'Error', 
      'Failed to Request data',
      [
        { text: 'Try Again', onPress: () => {
         setTimeout(() => fetchRequestData(), 100);
}  },
        { text: 'Cancel', style: 'cancel' }
      ]
    ); 
          }
         
          return;
        }

        // Check if request has offers (prevent editing)
        const { data: offers, error: offersError } = await supabase
          .from('offers')
          .select('id')
          .eq('request_id', requestId);

        if (offersError) {
          showAlert('Error', 'Failed to check request status.');
          navigation.goBack();
          return;
        }

       

        // Populate form with existing data
        setFormData({
          startDate: new Date(request.start_date),
          endDate: new Date(request.end_date),
          requestCountry: request.request_country,
          requestArea: request.request_area,
          numOfAdults: request.adults.toString(),
          requestChildren: request.children || [],
          hotelRating: request.hotel_rating,
          numOfRooms: request.rooms.toString(),
          meals: request.meals || [],
          minBudget: request.min_budget.toString(),
          maxBudget: request.max_budget.toString(),
          travelersNationality: request.travelers_nationality,
          preferredAgentsCountries: request.preferred_agents_countries || [],
          notes: request.notes || ''
        });

      } catch (error) {
        showAlert('Error', error.message);
        navigation.goBack();
      } finally {
        setInitialLoading(false);
      }
    };

    fetchRequestData();
  }, [isEditing, requestId, navigation]);

  // Fetch countries data
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('minimum_countries_info')
          .select('*')
          .order('country_name');
        
        if (error) throw error;
        setAllCountries(data);
      } catch (error) {
        showAlert('Error', error.message);
      }
    };

    fetchCountries();

    return () => {
      unsubscribeChannels(channelsRef.current);
    };
  }, []);

  // Fetch areas when country is selected
  useEffect(() => {
    const fetchAreas = async () => {
      if (!formData.requestCountry) {
        setAreas([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('areas')
          .select('*')
          .eq('country_id', formData.requestCountry)
          .eq('can_visit', true)
          .order('area_name');
        
        if (error) throw error;
        setAreas(data);
      } catch (error) {
        showAlert('Error', error.message);
      }
    };

    fetchAreas();
  }, [formData.requestCountry]);

  // Handle date changes
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const currentEndDate = formData.endDate;
      let newEndDate = currentEndDate;
      
      // If end date is before or equal to new start date, set end date to start date + 1 day
      if (currentEndDate <= selectedDate) {
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        newEndDate = nextDay;
      }
      
      setFormData({
        ...formData,
        startDate: selectedDate,
        endDate: newEndDate
      });
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        endDate: selectedDate
      });
    }
  };

  // Handle adding/removing children
  const addChild = (age) => {
    setFormData({
      ...formData,
      requestChildren: [...formData.requestChildren, age]
    });
  };

  const removeChild = (age) => {
    setFormData({
      ...formData,
      requestChildren: removeFirstOccurrence(formData.requestChildren, age)
    });
  }

  // Handle meal selection
  const toggleMeal = (meal) => {
    const meals = [...formData.meals];
    const index = meals.indexOf(meal);
    
    if (index === -1) {
      meals.push(meal);
    } else {
      meals.splice(index, 1);
    }
    
    setFormData({
      ...formData,
      meals
    });
  };

  // Handle preferred agent country selection
  const addPreferredAgentCountry = (countryId) => {
    if (formData.preferredAgentsCountries.length < 2 && !formData.preferredAgentsCountries.includes(countryId)) {
      setFormData({
        ...formData,
        preferredAgentsCountries: [...formData.preferredAgentsCountries, countryId]
      });
    }
  };

  const removePreferredAgentCountry = (countryId) => {
    setFormData({
      ...formData,
      preferredAgentsCountries: formData.preferredAgentsCountries.filter(id => id !== countryId)
    });
  };

  // Submit form
  const handleSubmit = async () => {
      
    try {
      // Basic form validation
      const today= new Date().setHours(0,0,0,0);
      if (formData.startDate < new Date(today)) {
        showAlert('The Dates are not valid');
        return;
      }
      if (formData.startDate >= formData.endDate) {
        showAlert('The Dates are not valid');
        return;
      }
      if (!formData.requestCountry) {
        showAlert('Please select a destination country');
        return;
      }
      if (!formData.requestArea) {
            
           
        showAlert('Please select a destination area');
        return;
      }
      if (!formData.numOfAdults || parseInt(formData.numOfAdults) < 1) {
        showAlert('Please enter at least 1 adult');
        return;
      }
      if (!formData.hotelRating && formData.hotelRating !== 0) {
        showAlert('Please select a hotel rating');
        return;
      }
      if (!formData.numOfRooms || parseInt(formData.numOfRooms) < 1) {
        showAlert('Please enter at least 1 room');
        return;
      }
      if (!formData.minBudget || !formData.maxBudget) {
        showAlert('Please enter both minimum and maximum budget');
        return;
      }
      if (parseInt(formData.minBudget) > parseInt(formData.maxBudget)) {
        showAlert('Minimum budget cannot be greater than maximum budget');
        return;
      }
      if (!formData.travelersNationality) {
        showAlert('Please select travelers nationality');
         return;
      }
      if (formData.preferredAgentsCountries.length === 0) {
        showAlert('Please choose at least one country where you can pay agents');
        return;
      }
      
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        showAlert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }
      
      // Refresh all countries data to ensure we have the latest status
      const { data: refreshedCountries, error: countriesError } = await supabase
        .from('minimum_countries_info')
        .select('*')
        .order('country_name');
      
      
     
      // Update the countries state with fresh data
      setAllCountries(refreshedCountries);
       if (countriesError){ 

showAlert('Failed to validate countries. Please try again.');
  return;
}
      // Validate destination country
      const destinationCountry = refreshedCountries.find(c => c.id === formData.requestCountry);
      if (!destinationCountry || !destinationCountry.can_visit) {
        // Reset country and area selections
        setFormData(prev => ({
          ...prev,
          requestCountry: null,
          requestArea: null
        }));
        
        // Reset dropdown UI states
        if (countryDropdownRef.current) {
          countryDropdownRef.current.reset();
        }
        if (areaDropdownRef.current) {
          areaDropdownRef.current.reset();
        }
        
        showAlert('The selected destination country is no longer available for visits. Please select another country.');
        return;
      }
      
      // Validate nationality country
      const nationalityCountry = refreshedCountries.find(c => c.id === formData.travelersNationality);
      if (!nationalityCountry || !nationalityCountry.citizens_can_travel) {
        // Reset nationality selection
        setFormData(prev => ({
          ...prev,
          travelersNationality: null
        }));
        
        // Reset dropdown UI state
        if (nationalityDropdownRef.current) {
          nationalityDropdownRef.current.reset();
        }
        
        showAlert('The selected nationality is no longer allowed to travel. Please select another nationality.');
        return;
      }
      
      // Validate preferred agent countries
      if (formData.preferredAgentsCountries.length > 0) {
        const invalidAgentCountries = formData.preferredAgentsCountries.filter(
          countryId => !refreshedCountries.some(c => c.id === countryId)
        );
        
        if (invalidAgentCountries.length > 0) {
          // Reset invalid preferred agent countries
          setFormData(prev => ({
            ...prev,
            preferredAgentsCountries: []
          }));
          
          // Reset dropdown UI state
          if (preferredAgentsDropdownRef.current) {
            preferredAgentsDropdownRef.current.reset();
          }
          
          showAlert('Some preferred agent countries are no longer available. They have been removed from your selection.');
          return;
        }
      }
      
      // Refresh areas data for the selected country
      const { data: refreshedAreas, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .eq('country_id', formData.requestCountry)
        .eq('can_visit', true)
        .order('area_name');
      
     
      
      // Update the areas state with fresh data
      setAreas(refreshedAreas);
       if (areasError) {
        showAlert('Failed to validate areas. Please try again.');
        return;
}
      
      // Validate area
      const selectedArea = refreshedAreas.find(a => a.id === formData.requestArea);
      if (!selectedArea) {
        // Reset area selection
        setFormData(prev => ({
          ...prev,
          requestArea: null
        }));
        
        // Reset dropdown UI state
        if (areaDropdownRef.current) {
          areaDropdownRef.current.reset();
        }
        
        showAlert('The selected area is no longer available for visits. Please select another area.');
        return;
      }

      // Prepare data for insert/update
      const requestData = {
        adults: parseInt(formData.numOfAdults),
        children: formData.requestChildren,
        min_budget: parseInt(formData.minBudget),
        max_budget: parseInt(formData.maxBudget),
        notes: formData.notes,
        start_date: format(formData.startDate, 'yyyy-MM-dd'),
        end_date: format(formData.endDate, 'yyyy-MM-dd'),
        rooms: parseInt(formData.numOfRooms),
        hotel_rating: formData.hotelRating,
        request_country: formData.requestCountry,
        request_area: formData.requestArea,
        travelers_nationality: formData.travelersNationality,
        meals: formData.meals,
        preferred_agents_countries: formData.preferredAgentsCountries,
        updated_at : new Date().toISOString(),
            };

      let error;
      
      if (isEditing) {
        // Update existing request

        const updateResult = await supabase
          .from('travel_requests')
          .update(requestData)
          .eq('id', requestId)
          .eq('creator_id', user.id);
        error = updateResult.error;
        
      } else {
        // Create new request
        const insertResult = await supabase
          .from('travel_requests')
          .insert([{
            ...requestData,
            creator_id: user.id
          }]);
        error = insertResult.error;
      
      }

      if (error){
 
 throw error;
}
      
      showAlert(
        'Success', 
        isEditing ? 'Travel request updated successfully!' : 'Travel request submitted successfully!'
      );
      
      // Wait for 3 seconds before navigating
      
      setTimeout(() => {
          navigation.reset({
          index: 0,
          routes: [{ name: 'Requests' }],
  });
      }, 3000);
      
    } catch (error) {
      showAlert('Error', "an error happened please try again");
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen while fetching request data
  if (initialLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Loading request data...</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 40}
    >
      <ScrollView style={styles.container} 
        keyboardShouldPersistTaps="handled"
      >
        <Text h4 style={styles.title}>
          {isEditing ? 'Edit Travel Request' : 'New Travel Request'}
        </Text>
        
        {/* Dates Row */}
     {/* Dates Row */}
<View style={styles.row}>
  {Platform.OS === 'web' ? (
    // WEB VERSION - Both dates
    <>
      <View style={styles.halfWidth}>
        <Text style={styles.label}>Start Date</Text>
        <input
          type="date"
          value={format(formData.startDate, 'yyyy-MM-dd')}
          onChange={(e) => {
            if (e.target.value) {
              onStartDateChange(null, new Date(e.target.value));
            }
          }}
          min={format(new Date(), 'yyyy-MM-dd')}
          style={styles.webDateInput}
        />
      </View>
      
      <View style={styles.halfWidth}>
        <Text style={styles.label}>End Date</Text>
        <input
          type="date"
          value={format(formData.endDate, 'yyyy-MM-dd')}
          onChange={(e) => {
            if (e.target.value) {
              onEndDateChange(null, new Date(e.target.value));
            }
          }}
          min={format(new Date(formData.startDate.getTime() + 86400000), 'yyyy-MM-dd')}
          style={styles.webDateInput}
        />
      </View>
    </>
  ) : (
    // MOBILE VERSION - Both dates with pickers
    <>
      <View style={styles.halfWidth}>
        <Text style={styles.label}>Start Date</Text>
        <Button
          title={format(formData.startDate, 'yyyy-MM-dd')}
          onPress={() => setShowStartDatePicker(true)}
          type="outline"
          buttonStyle={styles.dateButton}
        />
        {showStartDatePicker && (
          <DateTimePicker
            value={formData.startDate}
            mode="date"
            display="default"
            onChange={onStartDateChange}
            minimumDate={new Date()}
            style={styles.datePickerContainer}
          />
        )}
      </View>
      
      <View style={styles.halfWidth}>
        <Text style={styles.label}>End Date</Text>
        <Button
          title={format(formData.endDate, 'yyyy-MM-dd')}
          onPress={() => setShowEndDatePicker(true)}
          type="outline"
          buttonStyle={styles.dateButton}
        />
        {showEndDatePicker && (
          <DateTimePicker
            value={formData.endDate}
            mode="date"
            display="default"
            onChange={onEndDateChange}
            minimumDate={new Date(formData.startDate.getTime() + 86400000)}
            style={styles.datePickerContainer}
          />
        )}
      </View>
    </>
  )}
</View>
        
        {/* Destinations Row */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Destination Country</Text>
            <Dropdown
              ref={countryDropdownRef}
              data={allCountries
                .filter(country => country.can_visit)
                .map(country => ({
                  label: country.country_name,
                  value: country.id
                }))}
              labelField="label"
              valueField="value"
              value={formData.requestCountry}
              onChange={item => {
                setFormData({
                  ...formData,
                  requestCountry: item.value,
                  requestArea: null
                });
              }}
              placeholder="Select country"
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              search
              searchPlaceholder="Search country..."
            />
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Destination Area</Text>
            <Dropdown
              ref={areaDropdownRef}
              data={areas.map(area => ({
                label: area.area_name,
                value: area.id
              }))}
              labelField="label"
              valueField="value"
              value={formData.requestArea}
              onChange={item => {
                setFormData({
                  ...formData,
                  requestArea: item.value
                });
              }}
              placeholder="Select area"
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              search
              searchPlaceholder="Search area..."
              disabled={!formData.requestCountry}
            />
          </View>
        </View>
        
        {/* Travelers Row */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Number of Adults</Text>
            <Input
              keyboardType="numeric"
              value={formData.numOfAdults}
              onChangeText={(text) => {
                const value = text.replace(/[^0-9]/g, '');
                if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 1000)) {
                  setFormData({...formData, numOfAdults: value});
                }
              }}
              containerStyle={styles.input}
            />
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Add Child</Text>
            <Dropdown
              data={allChildrenAges}
              labelField="label"
              valueField="value"
              onChange={item => addChild(item.value)}
              placeholder="Select age"
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
            />
          </View>
        </View>
        
        {/* Children Row (if any) */}
        {formData.requestChildren.length > 0 && (
          <View style={styles.childrenContainer}>
            <Text style={styles.label}>Children</Text>
            <View style={styles.childrenList}>
              {formData.requestChildren.map((age,index )=> (
                <View key={`${age}-${index}`} style={styles.childTag}>
                  <Text style={styles.childTagText}>{age} years</Text>
                  <Button
                    icon={{ name: 'close', size: 15, color: 'white' }}
                    onPress={() => removeChild(age)}
                    buttonStyle={styles.removeChildButton}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Hotels Row */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Hotel Rating</Text>
            <Dropdown
              data={hotelRatings}
              labelField="label"
              valueField="value"
              value={formData.hotelRating}
              onChange={item => {
                setFormData({
                  ...formData,
                  hotelRating: item.value
                });
              }}
              placeholder="Select rating"
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
            />
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Number of Rooms</Text>
            <Input
              keyboardType="numeric"
              value={formData.numOfRooms}
              onChangeText={(text) => {
                const value = text.replace(/[^0-9]/g, '');
                if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 1000)) {
                  setFormData({...formData, numOfRooms: value});
                }
              }}
              containerStyle={styles.input}
            />
          </View>
        </View>
        
        {/* Meals Row */}
        <View style={styles.row}>
          <View style={styles.fullWidth}>
            <Text style={styles.label}>Meals</Text>
            <View style={styles.mealsContainer}>
              {['Breakfast', 'Lunch', 'Dinner'].map(meal => (
                <CheckBox
                  key={meal}
                  title={meal}
                  checked={formData.meals.includes(meal.toLowerCase())}
                  onPress={() => toggleMeal(meal.toLowerCase())}
                  containerStyle={styles.checkbox}
                />
              ))}
            </View>
          </View>
        </View>
    
        {/* Budget Row */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Minimum Budget in $</Text>
            <Input
              keyboardType="numeric"
              value={formData.minBudget}
              onChangeText={(text) => {
                const value = text.replace(/[^0-9]/g, '');
                if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 1000000)) {
                  setFormData({...formData, minBudget: value});
                }
              }}
              containerStyle={styles.input}
            />
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Maximum Budget in $</Text>
            <Input
              keyboardType="numeric"
              value={formData.maxBudget}
              onChangeText={(text) => {
                const value = text.replace(/[^0-9]/g, '');
                if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 1000000)) {
                  setFormData({...formData, maxBudget: value});
                }
              }}
              containerStyle={styles.input}
            />
          </View>
        </View>
        
        {/* Travelers Nationality Row */}
        <View style={styles.row}>
          <View style={styles.fullWidth}>
            <Text style={styles.label}>Travelers Nationality</Text>
            <Dropdown
              ref={nationalityDropdownRef}
              data={allCountries.
                filter(country => country.citizens_can_travel)
                .map(country => ({
                label: country.country_name,
                value: country.id
              }))}
              labelField="label"
              valueField="value"
              value={formData.travelersNationality}
              onChange={item => {
                setFormData({
                  ...formData,
                  travelersNationality: item.value
                });
              }}
              placeholder="Select nationality"
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              search
              searchPlaceholder="Search nationality..."
            />
          </View>
        </View>
   
        {/* Preferred Agents Countries Row */}
        <View style={styles.row}>
          <View style={styles.fullWidth}>
            <Text style={styles.label}>Countries where you can pay Agents</Text>
            <Dropdown
              ref={preferredAgentsDropdownRef}
              data={allCountries.map(country => ({
                label: country.country_name,
                value: country.id
              }))}
              labelField="label"
              valueField="value"
              onChange={item => {
                addPreferredAgentCountry(item.value);
              }}
              showsVerticalScrollIndicator={true}
              placeholder="Select country"
              style={[
                styles.dropdown, 
                formData.preferredAgentsCountries.length >= 2 ? styles.disabledDropdown : {}
              ]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              search
              searchPlaceholder="Search country..."
              disable={formData.preferredAgentsCountries.length >= 2}
              excludeItems={formData.preferredAgentsCountries.map(id => ({ value: id }))}
              excludeSearchItems={formData.preferredAgentsCountries.map(id => ({ value: id }))}
            />
            
            {/* Display selected countries as tags */}
            <View style={styles.agentCountriesContainer}>
              {formData.preferredAgentsCountries.map(countryId => (
                <View key={countryId} style={styles.agentCountryTag}>
                  <Text style={styles.agentCountryTagText}>
                    {allCountries.find(country => country.id === countryId)?.country_name}
                  </Text>
                  <Button
                    icon={{ name: 'close', size: 15, color: 'white' }}
                    onPress={() => removePreferredAgentCountry(countryId)}
                    buttonStyle={styles.removeAgentCountryButton}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
         
        {/* Notes Row */}
        <View style={styles.row}>
          <View style={styles.fullWidth}>
            <Text style={styles.label}
            numberOflines={2}
>Notes: examples: sea view, honeymoon, smoking, balcony
             </Text>
            <Input
              multiline
              numberOfLines={10}
              textAlignVertical='top'
              value={formData.notes}
              onChangeText={(text) => setFormData({...formData, notes: text})}
              containerStyle={styles.input}
              inputContainerStyle={styles.notesInputContainer}
              inputStyle={styles.notesInput}
            />
          </View>
        </View>
        
        {/* Submit Button */}
        <View style={styles.submitButtonContainer}>
          <Button
            title={isEditing ? "Update Request" : "Submit Request"}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  halfWidth: {
    width: '48%'
  },
  fullWidth: {
    width: '100%'
  },
  label: {
    marginBottom: 8
  },
  input: {
    marginBottom: 16,
   
  
     
  },
  dropdown: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 16
  },
  placeholderStyle: {
    fontSize: 16
  },
  selectedTextStyle: {
    fontSize: 16
  },
  mealsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  checkbox: {
    margin: 4,
    backgroundColor: 'transparent',
    borderWidth: 0
  },
  childrenContainer: {
    marginBottom: 16
  },
  childrenList: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  childTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 8
  },
  childTagText: {
    color: '#fff',
    marginRight: 4
  },
  removeChildButton: {
    backgroundColor: '#dc3545',
    padding: 2,
    borderRadius: 8
  },
  agentCountriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingBottom: 80,
  },
notesInputContainer: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  paddingHorizontal: 1,
  minHeight: 120,
},
notesInput: {
  minHeight: 100,
  textAlignVertical: 'top',
  paddingTop: 8,
  fontSize: 16,
},
  disabledDropdown: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
    opacity: 0.7
  },
  agentCountryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 8
  },
  agentCountryTagText: {
    color: '#fff',
    marginRight: 4
  },
  removeAgentCountryButton: {
    backgroundColor: '#dc3545',
    padding: 2,
    borderRadius: 8
  },
  submitButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 8,
  },
  dateButton: {
    marginBottom: 8,
  },
  datePickerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  sectionHeader: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  warningText: {
    color: '#dc3545',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successText: {
    color: '#28a745',
    fontWeight: 'bold',
    marginBottom: 8,
  },
webDateInput: {
  height: 50,             
  width: '100%',
  borderColor: '#2196F3', 
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 12,
  fontSize: 16,
  backgroundColor: 'transparent',
  color: '#2196F3',
  fontWeight: '500',
  cursor: 'pointer',
  outline: 'none',
},

});
