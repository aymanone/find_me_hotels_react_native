import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Button, Text, Card } from 'react-native-elements';
import supabase from '../config/supabase';

export default function TravelRequestList({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequests();

    // Set up realtime subscription
    const channel = supabase.channel('travel_requests_channel');
    
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'travel_requests'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRequests(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setRequests(prev => prev.filter(item => item.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setRequests(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data);
    } catch (error) {
      alert(error.message);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Set up realtime subscription
    const subscription = supabase
      .channel('travel_requests_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'travel_requests'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRequests(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setRequests(prev => prev.filter(item => item.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setRequests(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const renderRequest = ({ item }) => (
    <Card>
      <Card.Title>{item.country} - {item.area}</Card.Title>
      <Card.Divider />
      <Text>Dates: {item.startDate} to {item.endDate}</Text>
      <Text>Budget: {item.minBudget} - {item.maxBudget}</Text>
      <Text>Guests: {item.adults} adults, {item.children} children</Text>
      <Text>Nationality: {item.nationality}</Text>
      {item.notes && <Text>Notes: {item.notes}</Text>}
      <Button
        title="Make Offer"
        onPress={() => navigation.navigate('CreateOffer', { requestId: item.id })}
        containerStyle={styles.button}
      />
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  button: {
    marginTop: 10,
  },
});
