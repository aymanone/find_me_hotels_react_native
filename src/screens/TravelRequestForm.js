import { View, StyleSheet, ScrollView, Platform, Alert, KeyboardAvoidingView, TouchableOpacity ,Image} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import supabase from '../config/supabase';
import { Button, Input, Text, CheckBox, Icon } from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import format from 'date-fns/format';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { removeFirstOccurrence } from '../utils/arrayUtils';
import { showAlert } from "../components/ShowAlert";
import { unsubscribeChannels } from '../utils/channelUtils.js';
import { useTranslation } from '../config/localization';
import { theme, commonStyles, screenSize, responsive } from '../styles/theme';
import ClientAuthModal from '../components/ClientAuthModal';
import storage from '../utils/storage';
import LanguageSelector from '../components/LanguageSelector';
 const SectionCard = ({ title, icon, children }) => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
       <Icon
  type="font-awesome-5"
  name={icon}
  size={responsive(18)}
  color={theme.colors.primary}
  style={styles.sectionIcon}
/>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

export default function TravelRequestForm({ navigation, route }) {
  const { t, language } = useTranslation();

  useEffect(() => {
   // checkUserRole("client", navigation, "Signin");
  }, [navigation]);

  const channelsRef = useRef([]);
  const [isEditing, setIsEditing] = useState(!!route?.params?.requestId);
  const [requestId, setRequestId] = useState(route?.params?.requestId);
  const [allCountries, setAllCountries] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const countryDropdownRef = useRef(null);
  const areaDropdownRef = useRef(null);
  const nationalityDropdownRef = useRef(null);
  const preferredAgentsDropdownRef = useRef(null);

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
    minBudget: '0',
    maxBudget: '10',
    travelersNationality: null,
    preferredAgentsCountries: [],
    notes: ''
  });

  const hotelRatings = Array.from({ length: 8 }, (_, i) => ({
    label: t('TravelRequestForm', 'starsLabel', { value: i }),
    value: i
  }));

  const allChildrenAges = Array.from({ length: 18 }, (_, i) => ({
    label: t('TravelRequestForm', 'yearsLabel', { age: i }),
    value: i
  }));

  const resetForm = () => {
    setIsEditing(false);
    setRequestId(null);
  }
  useEffect(() => {
  const checkAuth = async () => {
    
    
    try {
      // Lightweight: just check if session exists (no refresh, no network)
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    } catch {
      setIsAuthenticated(false);
    }
  };
  
  checkAuth();
}, []);
  useEffect(() => {
    const fetchRequestData = async () => {
      if (!isEditing) return;

      try {
        setInitialLoading(true);
        const user = await getCurrentUser();
        if (!user) {
          showAlert(t('TravelRequestForm', 'error'), t('TravelRequestForm', 'userNotFound'));
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
            showAlert(t('TravelRequestForm', 'error'), t('TravelRequestForm', 'requestNotFound'));
            navigation.goBack();
          } else {
            showAlert(
              t('TravelRequestForm', 'error'),
              t('TravelRequestForm', 'failedLoadRequestData'),
              [
                {
                  text: t('TravelRequestForm', 'tryAgain'), onPress: () => {
                    setTimeout(() => fetchRequestData(), 100);
                  }
                },
                { text: t('TravelRequestForm', 'cancel'), style: 'cancel' }
              ]
            );
          }

          return;
        }

        const { data: offers, error: offersError } = await supabase
          .from('offers')
          .select('id')
          .eq('request_id', requestId);

        if (offersError) {
          showAlert(t('TravelRequestForm', 'error'), t('TravelRequestForm', 'failedToCheckRequestStatus'));
          navigation.goBack();
          return;
        }

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
        showAlert(t('TravelRequestForm', 'error'), error.message);
        navigation.goBack();
      } finally {
        setInitialLoading(false);
      }
    };

    fetchRequestData();
  }, [isEditing, requestId, navigation]);

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
        showAlert(t('TravelRequestForm', 'error'), error.message);
      }
    };

    fetchCountries();

    return () => {
      unsubscribeChannels(channelsRef.current);
    };
  }, []);

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
        showAlert(t('TravelRequestForm', 'error'), error.message);
      }
    };

    fetchAreas();
  }, [formData.requestCountry]);

  // Restore pending request from storage
  useEffect(() => {
    const loadPendingRequest = async () => {
      const savedData = await storage.getItem('pendingTravelRequest');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
           const restoredData = {
            ...parsedData,
            startDate: new Date(parsedData.startDate),
            endDate: new Date(parsedData.endDate)
          };
          setFormData(restoredData);
          showAlert(
            t('TravelRequestForm', 'draftRestored')
          );
          await storage.removeItem('pendingTravelRequest');
        } catch (error) {
          console.error('Error parsing saved request:', error);
          // Clear corrupted data
          await storage.removeItem('pendingTravelRequest');
        }
      }
    };

    loadPendingRequest();
  }, []); // Empty dependency array - only run once on mount
 

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      // Ensure start date is not in the past (handled by minimumDate prop in DateTimePicker but good to enforce logic)
      const today = new Date();
      today.setHours(0,0,0,0);
      if (selectedDate < today) {
          selectedDate = today;
      }

      // Logic: End date must be at least 1 day after start date
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      let newEndDate = formData.endDate;
      if (formData.endDate <= selectedDate) {
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

  const handleSubmit = async () => {

     // Check authentication FIRST
    const user = await getCurrentUser();

    if (!user) {
      await storage.setItem('pendingTravelRequest', JSON.stringify({
           ...formData,
          startDate: formData.startDate.toISOString(),
         endDate: formData.endDate.toISOString()
         }));
      showAlert(
        t('TravelRequestForm', 'authenticationRequired'),
        t('TravelRequestForm', 'pleaseSignInOrSignUpToSubmitRequest'),
        [
          {
            text: t('TravelRequestForm', 'signInOrSignUp'),
            onPress: () => setShowAuthModal(true)
          },
          {
            text: t('TravelRequestForm', 'cancel'),
            style: 'cancel'
          }
        ]
      );
      return;
    }
    try {
      const today = new Date().setHours(0, 0, 0, 0);
      if (formData.startDate < new Date(today)) {
        showAlert(t('TravelRequestForm', 'datesNotValid'));
        return;
      }
      if (formData.startDate >= formData.endDate) {
        showAlert(t('TravelRequestForm', 'datesNotValid'));
        return;
      }
      if (!formData.requestCountry) {
        showAlert(t('TravelRequestForm', 'pleaseSelectDestinationCountry'));
        return;
      }
      if (!formData.requestArea) {
        showAlert(t('TravelRequestForm', 'pleaseSelectDestinationArea'));
        return;
      }
      if (!formData.numOfAdults || parseInt(formData.numOfAdults) < 1) {
        showAlert(t('TravelRequestForm', 'pleaseEnterAtLeastOneAdult'));
        return;
      }
      if (!formData.hotelRating && formData.hotelRating !== 0) {
        showAlert(t('TravelRequestForm', 'pleaseSelectHotelRating'));
        return;
      }
      if (!formData.numOfRooms || parseInt(formData.numOfRooms) < 1) {
        showAlert(t('TravelRequestForm', 'pleaseEnterAtLeastOneRoom'));
        return;
      }
      if (!formData.minBudget || !formData.maxBudget) {
        showAlert(t('TravelRequestForm', 'pleaseEnterBothMinimumAndMaximumBudget'));
        return;
      }
      if (parseInt(formData.minBudget) > parseInt(formData.maxBudget)) {
        showAlert(t('TravelRequestForm', 'minimumBudgetCannotBeGreaterThanMaximumBudget'));
        return;
      }
      if (!formData.travelersNationality) {
        showAlert(t('TravelRequestForm', 'pleaseSelectTravelersNationality'));
        return;
      }
      if (formData.preferredAgentsCountries.length === 0) {
        showAlert(t('TravelRequestForm', 'pleaseChooseAtLeastOneCountryWhereYouCanPayAgents'));
        return;
      }

      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('TravelRequestForm', 'error'), t('TravelRequestForm', 'userNotFound'));
        await signOut(navigation);
        return;
      }

      const { data: refreshedCountries, error: countriesError } = await supabase
        .from('minimum_countries_info')
        .select('*')
        .order('country_name');

      setAllCountries(refreshedCountries);
      if (countriesError) {
        showAlert(t('TravelRequestForm', 'failedValidateCountries'));
        return;
      }

      const destinationCountry = refreshedCountries.find(c => c.id === formData.requestCountry);
      if (!destinationCountry || !destinationCountry.can_visit) {
        setFormData(prev => ({
          ...prev,
          requestCountry: null,
          requestArea: null
        }));

        if (countryDropdownRef.current) {
          countryDropdownRef.current.reset();
        }
        if (areaDropdownRef.current) {
          areaDropdownRef.current.reset();
        }

        showAlert(t('TravelRequestForm', 'selectedDestinationCountryNoLongerAvailable'));
        return;
      }

      const nationalityCountry = refreshedCountries.find(c => c.id === formData.travelersNationality);
      if (!nationalityCountry || !nationalityCountry.citizens_can_travel) {
        setFormData(prev => ({
          ...prev,
          travelersNationality: null
        }));

        if (nationalityDropdownRef.current) {
          nationalityDropdownRef.current.reset();
        }

        showAlert(t('TravelRequestForm', 'selectedNationalityNoLongerAllowedToTravel'));
        return;
      }

      if (formData.preferredAgentsCountries.length > 0) {
        const invalidAgentCountries = formData.preferredAgentsCountries.filter(
          countryId => !refreshedCountries.some(c => c.id === countryId)
        );

        if (invalidAgentCountries.length > 0) {
          setFormData(prev => ({
            ...prev,
            preferredAgentsCountries: []
          }));

          if (preferredAgentsDropdownRef.current) {
            preferredAgentsDropdownRef.current.reset();
          }

          showAlert(t('TravelRequestForm', 'somePreferredAgentCountriesNoLongerAvailable'));
          return;
        }
      }

      const { data: refreshedAreas, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .eq('country_id', formData.requestCountry)
        .eq('can_visit', true)
        .order('area_name');

      setAreas(refreshedAreas);
      if (areasError) {
        showAlert(t('TravelRequestForm', 'failedValidateAreas'));
        return;
      }

      const selectedArea = refreshedAreas.find(a => a.id === formData.requestArea);
      if (!selectedArea) {
        setFormData(prev => ({
          ...prev,
          requestArea: null
        }));

        if (areaDropdownRef.current) {
          areaDropdownRef.current.reset();
        }

        showAlert(t('TravelRequestForm', 'selectedAreaNoLongerAvailable'));
        return;
      }

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
        updated_at: new Date().toISOString(),
      };

      let error;

      if (isEditing) {
        const updateResult = await supabase
          .from('travel_requests')
          .update(requestData)
          .eq('id', requestId)
          .eq('creator_id', user.id);
        error = updateResult.error;

      } else {
        const insertResult = await supabase
          .from('travel_requests')
          .insert([{
            ...requestData,
            creator_id: user.id
          }]);
        error = insertResult.error;

      }

      if (error) {
        throw error;
      }

      showAlert(
        t('TravelRequestForm', 'success'),
        isEditing ? t('TravelRequestForm', 'travelRequestUpdatedSuccessfully') : t('TravelRequestForm', 'travelRequestSubmittedSuccessfully')
      );

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Requests' }],
        });
      }, 3000);

    } catch (error) {
      showAlert(t('TravelRequestForm', 'error'), t('TravelRequestForm', 'anErrorHappenedPleaseTryAgain'));
    } finally {
      setLoading(false);
    }
  };

 
  if (initialLoading) {
    return (
      <View style={[styles.container, commonStyles.loadingContainer]}>
        <Text>{t('TravelRequestForm', 'loadingRequestData')}</Text>
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
        contentContainerStyle={{ paddingBottom: 100 }}
      >
      {!isAuthenticated && (
  <View>
    {/* Language Selector & Login Button */}
    <View style={styles.topBar}>
     
      <TouchableOpacity 
        style={styles.signInButton}
        onPress={() => navigation.navigate('Signin')}
      >
        <Icon 
          type="font-awesome" 
          name="sign-in" 
          size={responsive(14, 16, 16, 16, 16)} 
          color={theme.colors.primary}
          style={{marginLeft: responsive(6, 8, 8, 8, 8)}}
        />
        <Text style={styles.signInButtonText}>
          {t('SigninScreen', 'login')}
        </Text>
      </TouchableOpacity>
       <LanguageSelector />
    </View>

    {/* Hero Section */}
    <View style={styles.formHeroSection}>
      {/* Logo */}
      <View style={styles.formLogoContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.formLogo}
          resizeMode="cover"
        />
      </View>

      {/* Brand Name */}
      <Text style={styles.formBrandName}>
        {t('SigninScreen', 'title')}
      </Text>

      {/* Main Headline */}
      <Text style={styles.formMainHeadline}>
        {t('SigninScreen', 'mainHeadline')}
      </Text>

      {/* Key Benefits */}
      <View style={styles.formBenefitsContainer}>
        <View style={styles.formBenefitItem}>
          <Icon 
            type="font-awesome" 
            name="eye-slash" 
            size={responsive(12, 14, 14, 14, 14)} 
            color={theme.colors.textWhite}
          />
          <Text style={styles.formBenefitText}>
            {t('SigninScreen', 'hiddenIdentity')}
          </Text>
        </View>
        
        <View style={styles.formBenefitItem}>
          <Icon 
            type="font-awesome" 
            name="tags" 
            size={responsive(12, 14, 14, 14, 14)} 
            color={theme.colors.textWhite}
          />
          <Text style={styles.formBenefitText}>
            {t('SigninScreen', 'cheaperPrices')}
          </Text>
        </View>
        
        <View style={styles.formBenefitItem}>
          <Icon 
            type="font-awesome" 
            name="check-circle" 
            size={responsive(12, 14, 14, 14, 14)} 
            color={theme.colors.textWhite}
          />
          <Text style={styles.formBenefitText}>
            {t('SigninScreen', 'trustedAgencies')}
          </Text>
        </View>
      </View>
    </View>
  </View>
)}
        <View style={styles.header}>
            <Text h4 style={styles.title}>
            {isEditing ? t('TravelRequestForm', 'editTravelRequest') : t('TravelRequestForm', 'newTravelRequest')}
            </Text>
            <Text style={styles.subtitle}>{t('TravelRequestForm', 'fillDetailsDescription') || 'Fill in the details to get the best offers'}</Text>
        </View>

        {/* 1. Destination & Dates */}
        <SectionCard title={t('TravelRequestForm', 'tripDetails') || 'Trip Details'} icon="map-marked-alt">
             {/* Dates Row */}
             <View style={styles.row}>
                {Platform.OS === 'web' ? (
                    <>
                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>{t('TravelRequestForm', 'startDate')}</Text>
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
                        <Text style={styles.label}>{t('TravelRequestForm', 'endDate')}</Text>
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
                    <>
                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>{t('TravelRequestForm', 'startDate')}</Text>
                        <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateTouchable}>
                         <Icon
  name="calendar-alt"
  type="font-awesome-5"
  size={responsive(16)}
  color={theme.colors.textSecondary}
  style={{ marginRight: responsive(8) }}
/>
                            <Text style={styles.dateText}>{format(formData.startDate, 'MMM dd, yyyy')}</Text>
                        </TouchableOpacity>
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
                        <Text style={styles.label}>{t('TravelRequestForm', 'endDate')}</Text>
                         <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateTouchable}>
                            <Icon name="calendar-alt" type="font-awesome-5" size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                            <Text style={styles.dateText}>{format(formData.endDate, 'MMM dd, yyyy')}</Text>
                        </TouchableOpacity>
                        {showEndDatePicker && (
                        <DateTimePicker
                            value={formData.endDate}
                            mode="date"
                            display="default"
                            onChange={onEndDateChange}
                            minimumDate={new Date(formData.startDate.getTime() + 86400000)}
                        />
                        )}
                    </View>
                    </>
                )}
            </View>

            {/* Location Row */}
            <View style={styles.row}>
                <View style={styles.halfWidth}>
                    <Text style={styles.label}>{t('TravelRequestForm', 'destinationCountry')}</Text>
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
                    placeholder={t('TravelRequestForm', 'selectCountry')}
                    style={styles.dropdown}
                    inputSearchStyle={styles.dropdownSearchInput}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    search
                    searchPlaceholder={t('TravelRequestForm', 'searchCountry')}
                    />
                </View>

                <View style={styles.halfWidth}>
                    <Text style={styles.label}>{t('TravelRequestForm', 'destinationArea')}</Text>
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
                    placeholder={t('TravelRequestForm', 'selectArea')}
                    style={styles.dropdown}
                    inputSearchStyle={styles.dropdownSearchInput}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    search
                    searchPlaceholder={t('TravelRequestForm', 'searchArea')}
                    disabled={!formData.requestCountry}
                    />
                </View>
            </View>
        </SectionCard>

        {/* 2. Guests & Accommodation */}
        <SectionCard title={t('TravelRequestForm', 'guestsAndStay') || 'Guests & Stay'} icon="user-friends">
             <View style={styles.row}>
                <View style={styles.halfWidth}>
                    <Text style={styles.label}>{t('TravelRequestForm', 'numberOfAdults')}</Text>
                    <Input
                    keyboardType="numeric"
                    value={formData.numOfAdults}
                    onChangeText={(text) => {
                        const value = text.replace(/[^0-9]/g, '');
                        // Force at least 1, handle empty state briefly
                        if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 1000)) {
                        setFormData({ ...formData, numOfAdults: value });
                        }
                    }}
                    containerStyle={styles.input}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    />
                </View>

                <View style={styles.halfWidth}>
                    <Text style={styles.label}>{t('TravelRequestForm', 'numberOfRooms')}</Text>
                     <Input
                        keyboardType="numeric"
                        value={formData.numOfRooms}
                        onChangeText={(text) => {
                            const value = text.replace(/[^0-9]/g, '');
                            if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 1000)) {
                            setFormData({ ...formData, numOfRooms: value });
                            }
                        }}
                        containerStyle={styles.input}
                        inputContainerStyle={styles.inputContainerStyle}
                        inputStyle={styles.inputStyle}
                        />
                </View>
            </View>

             <View style={styles.row}>
                <View style={styles.halfWidth}>
                     <Text style={styles.label}>{t('TravelRequestForm', 'hotelRating')}</Text>
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
                    placeholder={t('TravelRequestForm', 'selectRating')}
                    style={styles.dropdown}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    />
                </View>
                 <View style={styles.halfWidth}>
                    <Text style={styles.label}>{t('TravelRequestForm', 'addChild')}</Text>
                    <Dropdown
                    data={allChildrenAges}
                    labelField="label"
                    valueField="value"
                    onChange={item => addChild(item.value)}
                    placeholder={t('TravelRequestForm', 'selectAge')}
                    style={styles.dropdown}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    />
                 </View>
             </View>

            {formData.requestChildren.length > 0 && (
            <View style={styles.childrenContainer}>
                <Text style={styles.label}>{t('TravelRequestForm', 'children')}</Text>
                <View style={styles.childrenList}>
                {formData.requestChildren.map((age, index) => (
                    <View key={`${age}-${index}`} style={styles.childTag}>
                    <Text style={styles.childTagText}>{t('TravelRequestForm', 'yearsLabel', { age: age })}</Text>
                    <TouchableOpacity onPress={() => removeChild(age)} style={styles.removeIcon}>
                        <Icon name="times" type="font-awesome-5" size={12} color={theme.colors.textWhite} />
                    </TouchableOpacity>
                    </View>
                ))}
                </View>
            </View>
            )}

             <View style={styles.row}>
                <View style={styles.fullWidth}>
                    <Text style={styles.label}>{t('TravelRequestForm', 'meals')}</Text>
                    <View style={styles.mealsContainer}>
                    {['breakfast', 'lunch', 'dinner'].map(meal => (
                        <TouchableOpacity
                            key={meal}
                            onPress={() => toggleMeal(meal)}
                            style={[
                                styles.mealChip,
                                formData.meals.includes(meal) && styles.mealChipSelected
                            ]}
                        >
                           <Icon
  name={meal === 'breakfast' ? 'coffee' : meal === 'lunch' ? 'hamburger' : 'utensils'}
  type="font-awesome-5"
  size={responsive(14)}
  color={formData.meals.includes(meal) ? theme.colors.textWhite : theme.colors.text}
  style={{marginRight: responsive(6)}}
/>
                            <Text style={[styles.mealChipText, formData.meals.includes(meal) && styles.mealChipTextSelected]}>
                                {t('TravelRequestForm', meal)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    </View>
                </View>
            </View>
        </SectionCard>

        {/* 3. Budget & Nationality */}
        <SectionCard title={t('TravelRequestForm', 'budgetAndNationality') || 'Budget & Origin'} icon="wallet">
            <View style={styles.row}>
            <View style={styles.halfWidth}>
                <Text style={styles.label}>{t('TravelRequestForm', 'minimumBudget')}</Text>
                <Input
                keyboardType="numeric"
                value={formData.minBudget} // Default 0 set in initial state
                onChangeText={(text) => {
                    const value = text.replace(/[^0-9]/g, '');
                    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 1000000)) {
                    setFormData({ ...formData, minBudget: value });
                    }
                }}
                containerStyle={styles.input}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                rightIcon={<Text style={styles.currencyText}>USD</Text>}
                />
            </View>

            <View style={styles.halfWidth}>
                <Text style={styles.label}>{t('TravelRequestForm', 'maximumBudget')}</Text>
                <Input
                keyboardType="numeric"
                value={formData.maxBudget} // Default 10 set in initial state
                onChangeText={(text) => {
                    const value = text.replace(/[^0-9]/g, '');
                    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 1000000)) {
                    setFormData({ ...formData, maxBudget: value });
                    }
                }}
                containerStyle={styles.input}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                 rightIcon={<Text style={styles.currencyText}>USD</Text>}
                />
            </View>
            </View>

             <View style={styles.row}>
                <View style={styles.fullWidth}>
                    <Text style={styles.label}>{t('TravelRequestForm', 'travelersNationality')}</Text>
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
                    placeholder={t('TravelRequestForm', 'selectNationality')}
                    style={styles.dropdown}
                    inputSearchStyle={styles.dropdownSearchInput}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    search
                    searchPlaceholder={t('TravelRequestForm', 'searchNationality')}
                    />
                </View>
            </View>

            <View style={styles.row}>
                 <View style={styles.fullWidth}>
                    <Text style={styles.label}>{t('TravelRequestForm', 'countriesWhereYouCanPayAgents')}</Text>
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
                    placeholder={t('TravelRequestForm', 'selectCountry')}
                    style={[
                        styles.dropdown,
                        formData.preferredAgentsCountries.length >= 2 ? styles.disabledDropdown : {}
                    ]}
                    inputSearchStyle={styles.dropdownSearchInput}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    search
                    searchPlaceholder={t('TravelRequestForm', 'searchCountry')}
                    disable={formData.preferredAgentsCountries.length >= 2}
                    />

                    <View style={styles.agentCountriesContainer}>
                    {formData.preferredAgentsCountries.map(countryId => (
                        <View key={countryId} style={styles.agentCountryTag}>
                        <Text style={styles.agentCountryTagText}>
                            {allCountries.find(country => country.id === countryId)?.country_name}
                        </Text>
                         <TouchableOpacity onPress={() => removePreferredAgentCountry(countryId)} style={styles.removeIcon}>
                            <Icon name="times" type="font-awesome-5" size={12} color={theme.colors.textWhite} />
                        </TouchableOpacity>
                        </View>
                    ))}
                    </View>
                </View>
            </View>
        </SectionCard>

         {/* 4. Notes */}
        <SectionCard title={t('TravelRequestForm', 'additionalNotes') || 'Additional Notes'} icon="sticky-note">
             <View style={styles.row}>
                <View style={styles.fullWidth}>
                     <Text style={styles.notesHelperText}>
                        {t('TravelRequestForm', 'notesExamples')}
                    </Text>
                    <Input
                    multiline
                    numberOfLines={10}
                    textAlignVertical='top'
                    value={formData.notes}
                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                    containerStyle={styles.input}
                    inputContainerStyle={styles.notesInputContainer}
                    inputStyle={styles.notesInput}
                    
                    />
                </View>
            </View>
        </SectionCard>

        <View style={styles.submitButtonContainer}>
          <Button
            title={isEditing ? t('TravelRequestForm', 'updateRequest') : t('TravelRequestForm', 'submitRequest')}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            buttonStyle={styles.submitButton}
            titleStyle={styles.submitButtonText}
          />
        </View>
      </ScrollView>

       <ClientAuthModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          navigation={navigation}
          onAuthSuccess={() => {
            setShowAuthModal(false);
            showAlert(
              t('TravelRequestForm', 'success'),
              t('TravelRequestForm', 'youAreNowLoggedIn')
            );
          }}
        />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    padding: theme.responsiveSpacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  title: {
    textAlign: 'left',
    color: theme.colors.text,
    fontWeight: 'bold',
    marginBottom: responsive(4),
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: responsive(14),
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 0,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
  },
  sectionIcon: {
    marginRight: responsive(10),
    width: responsive(24),
  },
  sectionTitle: {
    fontSize: responsive(16),
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionContent: {
    marginTop: responsive(4),
  },
  row: {
    flexDirection: screenSize.isXSmall ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  halfWidth: {
    width: screenSize.isXSmall ? '100%' : '48%',
    marginBottom: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontSize: responsive(13),
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: responsive(6),
    marginLeft: responsive(2),
  },
  input: {
    paddingHorizontal: 0,
    marginBottom: 0,
  },
 inputContainerStyle: Platform.OS === 'web' ? {
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: theme.borderRadius.md,
  paddingHorizontal: responsive(12),
  height: responsive(48),
  backgroundColor: theme.colors.inputBackground,
} : {
  // Let React Native Elements handle mobile styling
  borderBottomWidth: 1,
  borderColor: theme.colors.border,
},
  inputStyle: {
    fontSize: responsive(15),
    color: theme.colors.text,
  },
  currencyText: {
    color: theme.colors.textTertiary,
    fontSize: responsive(12),
    fontWeight: '600',
  },
  dropdown: {
    height: responsive(48),
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: responsive(12),
    marginBottom: responsive(16),
    backgroundColor: theme.colors.inputBackground,
  },
  placeholderStyle: {
    fontSize: responsive(15),
    color: theme.colors.textTertiary,
  },
  selectedTextStyle: {
    fontSize: responsive(15),
    color: theme.colors.text,
  },
  dateTouchable: {
    height: responsive(48),
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsive(12),
    backgroundColor: theme.colors.inputBackground,
    marginBottom: responsive(16),
  },
  dateText: {
    fontSize: responsive(15),
    color: theme.colors.text,
  },
  webDateInput: {
    height: responsive(48),
    width: '100%',
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: responsive(12),
    fontSize: responsive(15),
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    outline: 'none',
  },
  mealsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: responsive(4),
    marginBottom: responsive(16),
    gap: responsive(8),
  },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive(8),
    paddingHorizontal: responsive(16),
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  mealChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  mealChipText: {
    fontSize: responsive(14),
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  mealChipTextSelected: {
    color: theme.colors.textWhite,
  },
  childrenContainer: {
    marginBottom: responsive(16),
  },
  childrenList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: responsive(4),
  },
  childTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary + '40',
    borderWidth: 1,
    borderRadius: theme.borderRadius.full,
    paddingVertical: responsive(6),
    paddingHorizontal: responsive(12),
    marginRight: responsive(8),
    marginBottom: responsive(8),
  },
  childTagText: {
    color: theme.colors.primary,
    fontSize: responsive(13),
    marginRight: responsive(6),
    fontWeight: '500',
  },
  removeIcon: {
    backgroundColor: theme.colors.primary,
    borderRadius: responsive(10),
    width: responsive(18),
    height: responsive(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentCountriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: responsive(8),
    marginBottom: responsive(16),
  },
  agentCountryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.success + '40',
    borderWidth: 1,
    borderRadius: theme.borderRadius.full,
    paddingVertical: responsive(6),
    paddingHorizontal: responsive(12),
    marginRight: responsive(8),
    marginBottom: responsive(8),
  },
  agentCountryTagText: {
    color: theme.colors.success,
    fontSize: responsive(13),
    marginRight: responsive(6),
    fontWeight: '500',
  },
  notesInputContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: responsive(1),
    backgroundColor: theme.colors.inputBackground,
    minHeight: responsive(120),
    
  },
  notesInput: {
    minHeight: responsive(100),
    textAlignVertical: 'top',
    fontSize: responsive(15),
    color: theme.colors.text,
     paddingTop: theme.spacing.sm,
  },
  notesHelperText: {
    fontSize: responsive(12),
    color: theme.colors.textSecondary,
    marginBottom: responsive(8),
    lineHeight: responsive(18),
    marginLeft: responsive(2),
  },
  disabledDropdown: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.7
  },
  submitButtonContainer: {
    padding: theme.responsiveSpacing.lg,
    paddingBottom: responsive(40),
  },
  submitButton: {
    height: responsive(52),
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  submitButtonText: {
    fontSize: responsive(16),
    fontWeight: 'bold',
  },
  // Add this to your styles object in other_request_form.js:

inputStyle: {
  fontSize: responsive(15),
  color: theme.colors.text,
  ...(Platform.OS === 'web' && {
    outlineWidth: 0,
    outline: 'none',
  }),
},

dropdownSearchInput: {
  height: 40,
  fontSize: responsive(14),
  borderColor: theme.colors.border,
  ...(Platform.OS === 'web' && {
    outline: 'none',
    outlineWidth: 0,
  }),
},
// Add these to your existing styles object:

topBar: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: responsive(16, 20, 20, 20, 20),
  paddingVertical: responsive(12, 16, 16, 16, 16),
  backgroundColor: theme.colors.backgroundWhite,
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.borderLight,
},

signInButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: responsive(8, 10, 10, 10, 10),
  paddingHorizontal: responsive(16, 18, 18, 18, 18),
  borderRadius: theme.borderRadius.md,
  borderWidth: 1,
  borderColor: theme.colors.primary,
  backgroundColor: theme.colors.backgroundWhite,
},

signInButtonText: {
  fontSize: responsive(13, 14, 14, 14, 14),
  fontWeight: '600',
  color: theme.colors.primary,
},

formHeroSection: {
  backgroundColor: theme.colors.primary,
  paddingVertical: responsive(32, 40, 40, 48, 48),
  paddingHorizontal: responsive(20, 24, 24, 24, 24),
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.borderLight,
},

formLogoContainer: {
  marginBottom: responsive(12, 16, 16, 20, 20),
},

formLogo: {
  width: responsive(100, 120, 140, 160, 180),
  height: responsive(50, 60, 70, 80, 90),
  borderRadius: responsive(8, 10, 10, 12, 12),
},

formBrandName: {
  fontSize: responsive(20, 22, 24, 26, 28),
  fontWeight: '700',
  color: theme.colors.textWhite,
  letterSpacing: -0.5,
  textAlign: 'center',
  marginBottom: responsive(8, 10, 10, 12, 12),
},

formMainHeadline: {
  fontSize: responsive(14, 15, 16, 17, 18),
  fontWeight: '600',
  color: theme.colors.textWhite,
  textAlign: 'center',
  lineHeight: responsive(20, 22, 24, 26, 28),
  marginBottom: responsive(16, 20, 20, 24, 24),
  paddingHorizontal: responsive(10, 15, 20, 25, 30),
},

formBenefitsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: responsive(8, 10, 10, 12, 12),
},

formBenefitItem: {
  flexDirection: 'row',
  alignItems: 'center',
   backgroundColor: 'rgba(255, 255, 255, 0.2)',
  borderWidth: 1,
  borderColor: theme.colors.primary + '30',
  paddingVertical: responsive(6, 8, 8, 10, 10),
  paddingHorizontal: responsive(10, 12, 12, 14, 14),
  borderRadius: responsive(16, 18, 18, 20, 20),
  gap: responsive(6, 6, 6, 8, 8),
},

formBenefitText: {
  fontSize: responsive(11, 12, 12, 13, 13),
  fontWeight: '700',
  color: theme.colors.textWhite,
},
});