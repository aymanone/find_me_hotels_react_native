import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AgentTravelRequestDetailsScreen = ({ route }) => {
  const { requestId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Travel Request Details</Text>
      <Text style={styles.subtitle}>Request ID: {requestId}</Text>
      <Text style={styles.comingSoon}>Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  comingSoon: {
    fontSize: 20,
    color: 'gray',
    fontStyle: 'italic',
  },
});

export default AgentTravelRequestDetailsScreen;