import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, Card, Button, Divider, Icon } from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole } from '../utils/auth';

export default function OfferDetailsScreen({ route, navigation }) {
  const { offerId } = route.params;
  const [offer, setOffer] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is a client
  useEffect(() => {
    const checkRole = async () => {
      const isClient = await checkUserRole('client');
      if (!isClient) {
        Alert.alert('Access Denied', 'You do not have permission to access this page');
        navigation.goBack();
      }
    };
    
    checkRole();
  }, [navigation]);

  // Fetch offer details and hotels
  useEffect(() => {
    const fetchOfferDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch offer details
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .select('*, travel_requests(*)')
          .eq('id', offerId)
          .single();

        if (offerError) throw offerError;
        if (!offerData) throw new Error('Offer not found');
        
        setOffer(offerData);

        // Fetch hotels for this offer
        const { data: hotelsData, error: hotelsError } = await supabase
          .from('offer_hotels')
          .select('*')
          .eq('offer_id', offerId);

        if (hotelsError) throw hotelsError;
        setHotels(hotelsData || []);
      } catch (error) {
        console.error('Error fetching offer details:', error.message);
        Alert.alert('Error', 'Failed to load offer details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchOfferDetails();
  }, [offerId, navigation]);

  const handleAcceptOffer = async () => {
    try {
      Alert.alert(
        'Accept Offer',
        'Are you sure you want to accept this offer?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Accept',
            onPress: async () => {
              setLoading(true);
              
              // Update the offer status
              const { error } = await supabase
                .from('offers')
                .update({ status: 'accepted' })
                .eq('id', offerId);
              
              if (error) throw error;
              
              // Update the request status
              await supabase
                .from('travel_requests')
                .update({ status: 'successful' })
                .eq('id', offer.request_id);
              
              Alert.alert('Success', 'Offer accepted successfully!');
              navigation.goBack();
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Error accepting offer:', error.message);
      Alert.alert('Error', 'Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.card}>
        <View style={styles.headerContainer}>
          <Text h4>Offer Details</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price Range:</Text>
            <Text style={styles.priceValue}>${offer.min_cost} - ${offer.max_cost}</Text>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Icon name="star" type="ionicon" size={18} color="#FFD700" />
            <Text style={styles.detailText}>
              Hotels Rating: {offer.min_rating} - {offer.max_rating} stars
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="business" type="ionicon" size={18} color="#007bff" />
            <Text style={styles.detailText}>
              Number of Hotels: {offer.num_of_hotels}
            </Text>
          </View>
          
          {offer.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{offer.description}</Text>
            </View>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Hotels Included</Text>
        {hotels.length > 0 ? (
          hotels.map((hotel, index) => (
            <Card key={index} containerStyle={styles.hotelCard}>
              <Text style={styles.hotelName}>{hotel.name}</Text>
              <View style={styles.hotelDetail}>
                <Icon name="star" type="ionicon" size={16} color="#FFD700" />
                <Text style={styles.hotelDetailText}>{hotel.rating} stars</Text>
              </View>
              <View style={styles.hotelDetail}>
                <Icon name="location" type="ionicon" size={16} color="#FF5722" />
                <Text style={styles.hotelDetailText}>{hotel.location}</Text>
              </View>
              {hotel.amenities && (
                <View style={styles.hotelDetail}>
                  <Icon name="checkmark-circle" type="ionicon" size={16} color="#4CAF50" />
                  <Text style={styles.hotelDetailText}>{hotel.amenities}</Text>
                </View>
              )}
            </Card>
          ))
        ) : (
          <Text style={styles.noHotelsText}>No specific hotels listed for this offer</Text>
        )}
        
        <View style={styles.actionsContainer}>
          <Button
            title="Accept Offer"
            icon={<Icon name="checkmark-circle" type="ionicon" color="#fff" size={20} style={styles.buttonIcon} />}
            buttonStyle={styles.acceptButton}
            onPress={handleAcceptOffer}
          />
          <Button
            title="Contact Agent"
            icon={<Icon name="chatbubble-ellipses" type="ionicon" color="#fff" size={20} style={styles.buttonIcon} />}
            buttonStyle={styles.contactButton}
            onPress={() => Alert.alert('Contact', 'This feature is coming soon!')}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

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
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceContainer: {
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  divider: {
    marginVertical: 15,
  },
  detailsContainer: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  descriptionContainer: {
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  hotelCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hotelDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  hotelDetailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  noHotelsText: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 15,
    color: '#666',
  },
  actionsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    flex: 1,
    marginRight: 10,
  },
  contactButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 10,
    flex: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
});
