import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';

export default function TravelRequestForm({ navigation }) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    country: '',
    area: '',
    minBudget: '',
    maxBudget: '',
    adults: '',
    children: '',
    nationality: '',
    notes: ''
  });

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from('travel_requests')
        .insert([
          {
            ...formData,
            user_id: supabase.auth.currentUser?.id,
            status: 'pending'
          }
        ]);

      if (error) throw error;
      alert('Travel request submitted successfully!');
      navigation.goBack();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text h4 style={styles.title}>New Travel Request</Text>
      
      <Input
        label="Start Date"
        placeholder="YYYY-MM-DD"
        value={formData.startDate}
        onChangeText={(text) => setFormData({...formData, startDate: text})}
      />
      
      <Input
        label="End Date"
        placeholder="YYYY-MM-DD"
        value={formData.endDate}
        onChangeText={(text) => setFormData({...formData, endDate: text})}
      />
      
      <Input
        label="Country"
        value={formData.country}
        onChangeText={(text) => setFormData({...formData, country: text})}
      />
      
      <Input
        label="Area"
        value={formData.area}
        onChangeText={(text) => setFormData({...formData, area: text})}
      />
      
      <Input
        label="Minimum Budget"
        keyboardType="numeric"
        value={formData.minBudget}
        onChangeText={(text) => setFormData({...formData, minBudget: text})}
      />
      
      <Input
        label="Maximum Budget"
        keyboardType="numeric"
        value={formData.maxBudget}
        onChangeText={(text) => setFormData({...formData, maxBudget: text})}
      />
      
      <Input
        label="Number of Adults"
        keyboardType="numeric"
        value={formData.adults}
        onChangeText={(text) => setFormData({...formData, adults: text})}
      />
      
      <Input
        label="Number of Children"
        keyboardType="numeric"
        value={formData.children}
        onChangeText={(text) => setFormData({...formData, children: text})}
      />
      
      <Input
        label="Nationality"
        value={formData.nationality}
        onChangeText={(text) => setFormData({...formData, nationality: text})}
      />
      
      <Input
        label="Additional Notes"
        multiline
        numberOfLines={4}
        value={formData.notes}
        onChangeText={(text) => setFormData({...formData, notes: text})}
      />
      
      <Button
        title="Submit Request"
        onPress={handleSubmit}
        containerStyle={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginVertical: 20,
  },
});
