import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-elements';
import { format } from 'date-fns';
import supabase from '../config/supabase';
import { checkUserRole } from '../utils/auth';

export default function ClientTravelRequestDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const [request, setRequest] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is a client
  useEffect(() => {
    const checkRole = async () => {
      const isClient = await checkUserRole('client');
      if (!isClient) {
        alert('You do not have permission to access this page');
        navigation.goBack();
      }
    };
    
    checkRole();
  }, []);

  // Fetch travel request details and offers
  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Fetch travel request
        const { data: requestData, error: requestError } = await supabase
          .from('travel_requests_agent')
          .select('*')
          .eq('id', id)
          .eq('creator_id', user.id)
          .single();

        if (requestError) throw requestError;
        if (!requestData) throw new Error('Travel request not found');
        
        setRequest(requestData);

        // Fetch offers for this request
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('*')
          .eq('request_id', id)
          .order('created_at', { ascending: false });

        if (offersError) throw offersError;
        setOffers(offersData || []);
      } catch (error) {
        console.error('Error fetching request details:', error.message);
        alert('Failed to load request details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [id]);

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
        <Text h4>{request.title}</Text>
        <Divider style={{ marginVertical: 10 }} />
        <Text style={styles.text}>Country: {request.country_name}</Text>
         <Text style={styles.text}>area: {request.area_name}</Text>
        <Text style={styles.text}>Start Date: {format(new Date(request.start_date), 'dd/MM/yyyy')}</Text>
        <Text style={styles.text}>End Date: {format(new Date(request.end_date), 'dd/MM/yyyy')}</Text>
        <Text style={styles.text}>Budget: from {request.min_budget}$ to {request.max_budget}$</Text>
        <Text style={styles.text}>Description: {request.description}</Text>
        <Divider style={{ marginVertical: 10 }} />
        <Text h4>Offers</Text>
        {offers.length > 0 ? (
          offers.map((offer, index) => (
            <View key={index} style={styles.offerContainer}>
              <Text style={styles.offerText}>Provider: {offer.provider_name}</Text>
              <Text style={styles.offerText}>Price: ${offer.price}</Text>
              <Text style={styles.offerText}>Details: {offer.details}</Text>
              <Divider style={{ marginVertical: 5 }} />
            </View>
          ))
        ) : (
          <Text style={styles.noOffersText}>No offers yet</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
  },
  offerContainer: {
    marginTop: 10,
  },
  offerText: {
    fontSize: 14,
    marginBottom: 3,
  },
  noOffersText: {
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 10,
  },
});
