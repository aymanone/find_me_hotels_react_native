import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import storage from '../utils/storage';
import supabase from '../config/supabase';
import { getCurrentUser, getUserRole } from '../utils/auth';
import { theme } from '../styles/theme';

const withTimeout = (promise, ms = 8000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

// After login, the role's screens are registered a moment later: wait for them
const waitForRoute = async (navigation, name) => {
  for (let i = 0; i < 20; i++) {
    if (navigation.getState().routeNames.includes(name)) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
};

export default function OfferRedirectScreen({ navigation, route }) {
  const { offerId, k } = route.params ?? {};

  useEffect(() => {
    const goToRole = async (role) => {
      role = role?.toLowerCase();
      let name = null;
      let params = { screen: 'Home' };
      if (role === 'client') {
        name = 'ClientApp';
        params = { screen: 'Home', params: { screen: 'ClientOfferDetails', params: { offerId } } };
      }  else if (role === 'agent') {
  const { data: offerRow } = await supabase
    .from('offers')
    .select('request_id')
    .eq('id', offerId)
    .single();

  name = 'AgentApp';
  params = offerRow?.request_id
    ? {
        screen: 'Home',
        params: {
          screen: 'AgentTravelRequestDetails',
          params: { requestId: offerRow.request_id, offerId },
        },
      }
    : { screen: 'Home' }; // couldn't find the request; land on the agent's home instead
}
       else if (role === 'company') {
        name = 'CompanyApp';
      } else if (role === 'admin') {
        name = 'AdminApp';
      }
      if (name && (await waitForRoute(navigation, name))) {
        await storage.removeItem('pendingOffer');
        navigation.replace(name, params);
        return true;
      }
      return false;
    };

    const run = async () => {
      try {
        if (!offerId) { navigation.replace('Signin'); return; }

        const user = await withTimeout(getCurrentUser());

        if (!user) {
          await storage.setItem('pendingOffer', JSON.stringify({ offerId }));

          if (k) {
            const { data: redeemed, error: redeemError } = await withTimeout(
              supabase.functions.invoke('offer-link-redeem', { body: { offerId, k } })
            );
            if (!redeemError && redeemed?.ok) {
              const { data, error } = await withTimeout(
                supabase.auth.verifyOtp({ token_hash: redeemed.token_hash, type: 'email' })
              );
              if (!error) {
                const ok = await goToRole(data?.user?.app_metadata?.role);
                if (ok) return;
                navigation.replace('Signin');
                return;
              }
              console.log('verifyOtp failed:', error.message);
            }
          }
          navigation.replace('Signin'); // expired, wrong, or no token
          return;
        }

        const role = await withTimeout(getUserRole());
        if (!(await goToRole(role))) navigation.replace('Signin');
      } catch (e) {
        console.error('OfferRedirect error:', e);
        try { await storage.setItem('pendingOffer', JSON.stringify({ offerId })); } catch {}
        navigation.replace('Signin');
      }
    };
    run();
  }, [navigation, offerId, k]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});