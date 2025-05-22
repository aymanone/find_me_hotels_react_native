import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import supabase from '../config/supabase';
import { Button, Input, Text, CheckBox } from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

export default function TravelRequestForm({ navigation }) {
  // Check if user is client
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.app_metadata.role !== 'client') {
        await supabase.auth.signOut();
        navigation.navigate('Signin');
      }
    };
    
    checkUserRole();
  }, [navigation]);

  // State variables
  const [allCountries, setAllCountries] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
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
        Alert.alert('Error', error.message);
      }
    };

    fetchCountries();

    // Set up realtime subscription for countries table
    const channel = supabase
      .channel('countries_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'countries' },
        () => {
          fetchCountries();
          // Reset country and area selections
          setFormData(prev => ({
            ...prev,
            requestCountry: null,
            requestArea: null,
            travelersNationality: null,
            preferredAgentsCountries: []
          }));
          setAreas([]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
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
        Alert.alert('Error', error.message);
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
    if (!formData.requestChildren.includes(age)) {
      setFormData({
        ...formData,
        requestChildren: [...formData.requestChildren, age]
      });
    }
  };

  const removeChild = (age) => {
    setFormData({
      ...formData,
      requestChildren: formData.requestChildren.filter(childAge => childAge !== age)
    });
  };

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
      // Validate form
      if (!formData.requestCountry) {
        throw new Error('Please select a destination country');
      }
      if (!formData.requestArea) {
        throw new Error('Please select a destination area');
      }
      if (!formData.numOfAdults || parseInt(formData.numOfAdults) < 1) {
        throw new Error('Please enter at least 1 adult');
      }
      if (!formData.hotelRating) {
        throw new Error('Please select a hotel rating');
      }
      if (!formData.numOfRooms || parseInt(formData.numOfRooms) < 1) {
        throw new Error('Please enter at least 1 room');
      }
      if (!formData.minBudget || !formData.maxBudget) {
        throw new Error('Please enter both minimum and maximum budget');
      }
      if (parseInt(formData.minBudget) > parseInt(formData.maxBudget)) {
        throw new Error('Minimum budget cannot be greater than maximum budget');
      }
      if (!formData.travelersNationality) {
        throw new Error('Please select travelers nationality');
      }

      setLoading(true);
     const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('travel_requests')
        .insert([
          {
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
            creator_id: user?.id
          }
        ]);

      if (error) throw error;
      
      Alert.alert('Success', 'Travel request submitted successfully!');
      
      // Wait for 3 seconds before navigating
      setTimeout(() => {
        navigation.navigate('Requests');
      }, 3000);
      
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text h4 style={styles.title}>New Travel Request</Text>
      
      {/* Dates Row */}
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Start Date</Text>
          <Button
            title={format(formData.startDate, 'yyyy-MM-dd')}
            onPress={() => setShowStartDatePicker(true)}
            type="outline"
          />
          {showStartDatePicker && (
            <DateTimePicker
              value={formData.startDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>
        
        <View style={styles.halfWidth}>
          <Text style={styles.label}>End Date</Text>
          <Button
            title={format(formData.endDate, 'yyyy-MM-dd')}
            onPress={() => setShowEndDatePicker(true)}
            type="outline"
          />
          {showEndDatePicker && (
            <DateTimePicker
              value={formData.endDate}
              mode="date"
              display="default"
              onChange={onEndDateChange}
              minimumDate={new Date(formData.startDate.getTime() + 86400000)} // startDate + 1 day
            />
          )}
        </View>
      </View>
      
      {/* Destinations Row */}
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Destination Country</Text>
          <Dropdown
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
            {formData.requestChildren.map(age => (
              <View key={age} style={styles.childTag}>
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
      
      {/* Budget Row */}
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Minimum Budget</Text>
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
          <Text style={styles.label}>Maximum Budget</Text>
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
      
      {/* Travelers Nationality Row */}
      <View style={styles.row}>
        <View style={styles.fullWidth}>
          <Text style={styles.label}>Travelers Nationality</Text>
          <Dropdown
            data={allCountries.map(country => ({
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
          <Text style={styles.label}>Preferred Agents Countries</Text>
          <Dropdown
            data={allCountries.map(country => ({
              label: country.country_name,
              value: country.id
            }))}
            labelField="label"
            valueField="value"
            value={formData.preferredAgentsCountries[0]}
            onChange={item => addPreferredAgentCountry(item.value)}
            placeholder="Select first country"
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            search
            searchPlaceholder="Search country..."
            disabled={formData.preferredAgentsCountries.length >= 2}
          />
          {formData.preferredAgentsCountries.length > 0 && (
            <Dropdown
              data={allCountries.map(country => ({
                label: country.country_name,
                value: country.id
              }))}
              labelField="label"
              valueField="value"
              value={formData.preferredAgentsCountries[1]}
              onChange={item => addPreferredAgentCountry(item.value)}
              placeholder="Select second country"
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              search
              searchPlaceholder="Search country..."
              disabled={formData.preferredAgentsCountries.length < 1 || formData.preferredAgentsCountries.length >= 2}
            />
          )}
          {formData.preferredAgentsCountries.map(countryId => (
            <View key={countryId} style={styles.agentCountryTag}>
              <Text style={styles.agentCountryTagText}>{allCountries.find(country => country.id === countryId)?.country_name}</Text>
              <Button
                icon={{ name: 'close', size: 15, color: 'white' }}
                onPress={() => removePreferredAgentCountry(countryId)}
                buttonStyle={styles.removeAgentCountryButton}
              />
            </View>
          ))}
        </View>
      </View>
      
      {/* Notes Row */}
      <View style={styles.row}>
        <View style={styles.fullWidth}>
          <Text style={styles.label}>Notes</Text>
          <Input
            multiline
            numberOfLines={4}
            value={formData.notes}
            onChangeText={(text) => setFormData({...formData, notes: text})}
            containerStyle={styles.input}
          />
        </View>
      </View>
      
      {/* Submit Button */}
      <View style={styles.submitButtonContainer}>
        <Button
          title="Submit Request"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff'
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
    marginBottom: 16
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
    alignItems: 'center'
  }
});