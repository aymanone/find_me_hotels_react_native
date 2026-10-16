import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Linking,
  Platform,
  
} from 'react-native';
import { 
  Text, 
  Card, 
  Icon 
} from 'react-native-elements';
import supabase from '../config/supabase';
import {MESSAGING_APPS} from '../config/CONSTANTS';
import { checkUserRole } from '../utils/auth';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, responsive, screenSize } from '../styles/theme';
import { useTranslation } from '../config/localization';

const ClientOfferDetailsScreen = ({ route, navigation }) => {
  const { t,language } = useTranslation();
  const { offerId } = route.params;
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState(null);
  const [hotelsSectionCollapsed, setHotelsSectionCollapsed] = useState(true);
  const [agentSectionCollapsed, setAgentSectionCollapsed] = useState(false);
  const [offerInfoSectionCollapsed, setOfferInfoSectionCollapsed] = useState(false);
  useEffect(() => {
    
    const fetchOfferDetails = async () => {
      try {
        // First check if user is a client with proper permissions
        const isValidClient = await checkUserRole('client');

        if (!isValidClient) {
          showAlert(
            t('ClientOfferDetailsScreen', 'accessDenied'), 
            t('ClientOfferDetailsScreen', 'accessDeniedMessage')
          );
          navigation.goBack();
          return;
        }
        
        // Fetch offer details with agent information
       const { data: offer, error } = await supabase
      .from('offers')
  .select(`
    num_of_hotels, hotels,status, min_rating, max_rating, min_cost, max_cost,
    request_id, updated_at, created_at,start_date,end_date,
    agents!offers_agent_id_fkey (
      first_name, second_name, id, phone_number, messaging_app,
    
        countries!agents_agent_country_fkey(country_name),
          companies!agents_company_id_fkey (company_name, url,license_num, address,
          company_country:countries!companies_company_country_id_fkey(country_name)
          )
    )
  `)
  .eq('id', offerId)
  .single();

        if (error) {
          console.error('Error fetching offer:', error);
          showAlert(
            t('ClientOfferDetailsScreen', 'error'), 
            t('ClientOfferDetailsScreen', 'loadError'),
            [
              { text: t('ClientOfferDetailsScreen', 'tryAgain'), onPress: () => {
                setTimeout(() => fetchOfferDetails(), 100);
              } },
              { text: t('ClientOfferDetailsScreen', 'cancel'), style: 'cancel' }
            ]
          );
          return;
        }
        
        setOffer(offer);
        // Test if you can query agents directly

        // Mark offer as viewed if not already
        if (offer.status === 'not viewed') {
          await supabase.rpc('mark_offer_as_viewed', { p_offer_id: offerId, p_status: 'viewed' });
        }
      } catch (error) {
        console.error('Error in fetchOfferDetails:', error);
        showAlert(
          t('ClientOfferDetailsScreen', 'error'), 
          t('ClientOfferDetailsScreen', 'unexpectedError')
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchOfferDetails();
  }, [offerId, navigation]);

  const toggleHotelsSection = () => {
    setHotelsSectionCollapsed(!hotelsSectionCollapsed);
  };

  const toggleAgentSection = () => {
    setAgentSectionCollapsed(!agentSectionCollapsed);
  };
  const toggleOfferInfoSection = () => {
  setOfferInfoSectionCollapsed(!offerInfoSectionCollapsed);
};
const appHasLink =(messagingApp) =>{
  if(!messagingApp) return false;

  //const validApps=['whatsapp','telegram'];
  return MESSAGING_APPS.map(app=> app.toUpperCase())
  .includes(messagingApp.toUpperCase());
};

  const openUrl = (url) => {
    if (!url) return;
    
    // Add http:// if not present
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `http://${url}`;
    }
    
    Linking.canOpenURL(fullUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(fullUrl);
        } else {
          showAlert(
            t('ClientOfferDetailsScreen', 'error'), 
            `${t('ClientOfferDetailsScreen', 'couldNotOpen')} URL: ${fullUrl}`
          );
        }
      })
      .catch(err => console.error('Error opening URL:', err));
  };
    const markContacted = () => {
    if (offer?.status === 'not viewed' || offer?.status === 'viewed') {
      supabase
        .rpc('mark_offer_as_viewed', { p_offer_id: offerId, p_status: 'contacted' })
        .then(({ error }) => { if (error) console.error(error); });
      setOffer(prev => ({ ...prev, status: 'contacted' }));
    }
  };

  const copyPhone = async (phoneNumber) => {
    if (!phoneNumber) return;
    markContacted();
    if (Platform.OS === 'web' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(phoneNumber);
        showAlert(t('ClientOfferDetailsScreen', 'success'), t('ClientOfferDetailsScreen', 'phoneCopied'));
        return;
      } catch (e) {}
    }
    Linking.openURL(`tel:${phoneNumber.replace(/[^\d+]/g, '')}`);
  };

  const openMessagingApp = (phoneNumber, app) => {
  if (!phoneNumber) {
    showAlert(
      t('ClientOfferDetailsScreen', 'error'), 
      t('ClientOfferDetailsScreen', 'noPhoneNumber')
    );
    return;
  }
    markContacted();
  // Format phone number (remove spaces, ensure it starts with +)
    const formattedPhone = phoneNumber.replace(/[^\d+]/g, '');
  
  let url;
  switch(app.toLowerCase()) {
    case 'whatsapp':
       url = `https://wa.me/${formattedPhone.replace('+', '')}`;
      break;
    case 'telegram':
      url = `tg://resolve?domain=${formattedPhone}`;
      break;
    case 'signal':
      url = `signal://chat?phone=${formattedPhone}`;
      break;
    case 'wechat':
      url = `weixin://dl/chat?${formattedPhone}`;
      break;
    case 'imo':
      url = `imo://chat?phone=${formattedPhone}`;
      break;
    default:
      url = `tel:${formattedPhone}`;
  }
  
  Linking.canOpenURL(url)
    .then(supported => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        if (app.toLowerCase() === 'whatsapp') {
          // Fallback to web WhatsApp
          return Linking.openURL(`https://wa.me/${formattedPhone}`);
        } else {
          showAlert(
            t('ClientOfferDetailsScreen', 'error'), 
            `${app} ${t('ClientOfferDetailsScreen', 'appNotInstalled')}`
          );
        }
      }
    })
    .catch(err => {
      console.error(`Error opening ${app}:`, err);
      showAlert(
        t('ClientOfferDetailsScreen', 'error'), 
        `${t('ClientOfferDetailsScreen', 'couldNotOpen')} ${app}`
      );
    });
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary}/>
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('ClientOfferDetailsScreen', 'offerNotFound')}</Text>
      </View>
    );
  }

  const agent = offer.agents;

  // Same date format as before
  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-US', {
          month: '2-digit',
          day: 'numeric',
          year: 'numeric'
        })
      : t('ClientOfferDetailsScreen', 'notProvided');

  // In Arabic, push the hotel rows (labels AND values) to the right edge
  const isArabic = /[\u0600-\u06FF]/.test(t('ClientOfferDetailsScreen', 'hotels'));
  const hotelTextDirection = isArabic ? { textAlign: 'right', writingDirection: 'rtl' } : null;

  return (
    <ScrollView style={styles.container}>
      {/* Link to all offers of this travel request */}
      {!!offer.request_id && (
        <TouchableOpacity
          style={styles.allOffersRow}
          onPress={() => navigation.navigate('ClientTravelRequestDetails', { id: offer.request_id })}
        >
          <Icon
            name="list-outline"
            type="ionicon"
            size={theme.responsiveComponents.icon.medium}
            color={theme.colors.primary}
          />
          <Text style={styles.allOffersText}>{t('ClientOfferDetailsScreen', 'viewAllOffers')}</Text>
        </TouchableOpacity>
      )}

      {/* Offer Summary */}
      <Card containerStyle={styles.card}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={toggleOfferInfoSection}
        >
          <Text style={styles.sectionTitle}>{t('ClientOfferDetailsScreen', 'offerInformation')}</Text>
          <Icon 
            name={offerInfoSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
            type="ionicon" 
            size={theme.responsiveComponents.icon.medium}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {!offerInfoSectionCollapsed && (
        <View style={styles.sectionContent}>
          {/* Date Range Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'startDate')}</Text>
              <Text style={styles.value}>{formatDate(offer.start_date)}</Text>
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'endDate')}</Text>
              <Text style={styles.value}>{formatDate(offer.end_date)}</Text>
            </View>
          </View>

          {!!offer.updated_at && offer.updated_at !== offer.created_at && (
            <View style={styles.metaRow}>
              <Icon
                name="time-outline"
                type="ionicon"
                size={theme.responsiveComponents.icon.small}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metaText}>
                {t('ClientOfferDetailsScreen', 'updatedOn')} {formatDate(offer.updated_at)}
              </Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'minCost')}</Text>
              <Text style={styles.value}>${offer.min_cost}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'maxCost')}</Text>
              <Text style={styles.value}>${offer.max_cost}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'minRating')}</Text>
              <Text style={styles.value}>{offer.min_rating} {t('ClientOfferDetailsScreen', 'stars')}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'maxRating')}</Text>
              <Text style={styles.value}>{offer.max_rating} {t('ClientOfferDetailsScreen', 'stars')}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'numberHotels')}</Text>
              <Text style={styles.value}>{offer.num_of_hotels}</Text>
            </View>
          </View>
        </View>
        )}
      </Card>
      
      {/* Hotels Section */}
      <Card containerStyle={styles.card}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={toggleHotelsSection}
        >
          <Text style={styles.sectionTitle}>{t('ClientOfferDetailsScreen', 'hotels')}</Text>
          <Icon 
            name={hotelsSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
            type="ionicon" 
            size={theme.responsiveComponents.icon.medium}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
        
        {!hotelsSectionCollapsed && offer.hotels && (
          <View style={styles.sectionContent}>
            {offer.hotels.map((hotel, index) => (
              <Card key={index} containerStyle={styles.hotelItemCard}>
                {/* Hotel Name */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="business-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary}/>
                  <Text style={[styles.hotelDetailText, hotelTextDirection]}>
                    <Text style={styles.hotelDetailLabel}>{t('ClientOfferDetailsScreen', 'name')} </Text>
                    {hotel.name}
                  </Text>
                </View>

                {/* Cost */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="cash-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.success} />
                  <Text style={[styles.hotelDetailText, hotelTextDirection]}>
                    <Text style={styles.hotelDetailLabel}>{t('ClientOfferDetailsScreen', 'cost')} </Text>
                    ${hotel.cost}
                  </Text>
                </View>

                {/* Hotel Address */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="location-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                  <Text style={[styles.hotelDetailText, hotelTextDirection]}>
                    <Text style={styles.hotelDetailLabel}>{t('ClientOfferDetailsScreen', 'address')} </Text>
                    {hotel.address}
                  </Text>
                </View>

                {/* Rooms */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="bed-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                  <Text style={[styles.hotelDetailText, hotelTextDirection]}>
                    <Text style={styles.hotelDetailLabel}>{t('ClientOfferDetailsScreen', 'rooms')} </Text>
                    {hotel.rooms} {hotel.rooms === 1 ? t('ClientOfferDetailsScreen', 'room') : t('ClientOfferDetailsScreen', 'rooms')}
                  </Text>
                </View>

                              {/* Room type (own line); older offers fall back to the room size */}
                {!!hotel.room_type && (
                  <View style={styles.hotelDetailRow}>
                    <Icon name="bed-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                    <Text style={[styles.hotelDetailText, hotelTextDirection]}>
                      <Text style={styles.hotelDetailLabel}>{t('AgentTravelRequestDetailsScreen', 'roomType')} </Text>
                      {hotel.room_type}
                    </Text>
                  </View>
                )}
                {!hotel.room_type && !!hotel.room_size && (
                  <View style={styles.hotelDetailRow}>
                    <Icon name="resize-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                    <Text style={[styles.hotelDetailText, hotelTextDirection]}>
                      {hotel.room_size} {t('ClientOfferDetailsScreen', 'squareMeters')}
                    </Text>
                  </View>
                )}

                {/* Rating */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="star" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.warning} />
                  <Text style={[styles.hotelDetailText, hotelTextDirection]}>
                    <Text style={styles.hotelDetailLabel}>{t('ClientOfferDetailsScreen', 'rating')} </Text>
                    {hotel.rating} {t('ClientOfferDetailsScreen', 'stars')}
                  </Text>
                </View>

                {/* Meals */}
                <View style={styles.hotelDetailRow}>
                  <Icon name="restaurant-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                  <Text style={[styles.hotelDetailText, hotelTextDirection]}>
                    <Text style={styles.hotelDetailLabel}>{t('ClientOfferDetailsScreen', 'meals')} </Text>
                    {hotel.meals && hotel.meals.length > 0 ? hotel.meals.map((meal) => t('AgentTravelRequestDetailsScreen', meal)).join(', ') : t('ClientOfferDetailsScreen', 'none')}
                  </Text>
                </View>

                {/* Notes */}
                {!!hotel.notes && (
                  <View style={styles.hotelDetailRow}>
                    <Icon name="document-text-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                    <Text style={[styles.hotelDetailText, hotelTextDirection]}>
                      <Text style={styles.hotelDetailLabel}>{t('ClientOfferDetailsScreen', 'notes')} </Text>
                      {hotel.notes}
                    </Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </Card>
      
      {/* Agent Section */}
      <Card containerStyle={styles.card}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={toggleAgentSection}
        >
          <Text style={styles.sectionTitle}>{t('ClientOfferDetailsScreen', 'agentInformation')}</Text>
          <Icon 
            name={agentSectionCollapsed ? 'chevron-down' : 'chevron-up'} 
            type="ionicon" 
            size={theme.responsiveComponents.icon.medium}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
        
        {!agentSectionCollapsed && agent && (
          <View style={styles.sectionContent}>
            {/* Agent Name */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'agentName')}:</Text>
                <Text style={styles.value}>{agent.first_name} {agent.second_name}</Text>
              </View>
            </View>
            
            {/* Agent Contact */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'contact')}:</Text>

                {appHasLink(agent.messaging_app) ? (
                  <>
                    <Text selectable style={styles.value}>{t('ClientOfferDetailsScreen', 'phone')} {agent.phone_number}</Text>
                    <Text style={styles.value}>{t('ClientOfferDetailsScreen', 'messagingApp')} {agent.messaging_app}</Text>
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() => openMessagingApp(agent.phone_number, agent.messaging_app)}
                    >
                      <Icon
                        name="chatbubble-outline"
                        type="ionicon"
                        size={theme.responsiveComponents.icon.medium}
                        color={theme.colors.textWhite}
                      />
                      <Text style={styles.contactButtonText}>
                        {t('ClientOfferDetailsScreen', 'tapToContactVia')} {agent.messaging_app}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={() => openMessagingApp(agent.phone_number, agent.messaging_app)}>
                    <View style={styles.contactButtonContent}>
                      <Text selectable style={styles.value}>{t('ClientOfferDetailsScreen', 'phone')} {agent.phone_number}</Text>
                      <Text style={styles.value}>{t('ClientOfferDetailsScreen', 'messagingApp')} {agent.messaging_app}</Text>
                    </View>
                  </TouchableOpacity>
                  )}
                                 <TouchableOpacity style={styles.copyButton} onPress={() => copyPhone(agent.phone_number)}>
                  <Icon name="copy-outline" type="ionicon" size={theme.responsiveComponents.icon.medium} color={theme.colors.primary} />
                  <Text style={styles.copyButtonText}>{t('ClientOfferDetailsScreen', 'copyPhone')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Agent Country */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'agentLocation')}:</Text>
                <Text style={styles.value}>{agent.countries.country_name || t('ClientOfferDetailsScreen', 'notSpecified')}</Text>
              </View>
            </View>
            
            {/* Company Name */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'company')}:</Text>
                <Text style={styles.value}>{agent.companies?.company_name || t('ClientOfferDetailsScreen', 'notSpecified')}</Text>
              </View>
            </View>
             {/* Company headquarter*/}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'companyHeadquarter')}:</Text>
                <Text style={styles.value}>{agent.companies?.company_country?.country_name || t('ClientOfferDetailsScreen', 'notSpecified')}</Text>
              </View>
            </View>
              {/* Company license */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'companyLicense')}:</Text>
                <Text style={styles.value}>{agent.companies?.license_num || t('ClientOfferDetailsScreen', 'notSpecified')}</Text>
              </View>
            </View>
            {/* Company Address */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'companyAddress')}:</Text>
                <Text style={styles.value}>{agent.companies?.address || t('ClientOfferDetailsScreen', 'notSpecified')}</Text>
              </View>
            </View>
            
            {/* Company URL */}
            {!!agent.companies?.url && (
              <View style={styles.infoRow}>
                <View style={styles.fullWidth}>
                  <Text style={styles.label}>{t('ClientOfferDetailsScreen', 'companyWebsite')}:</Text>
                  <TouchableOpacity onPress={() => openUrl(agent.companies.url)}>
                    <Text style={styles.linkText}>{agent.companies.url}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </Card>
    </ScrollView>
  );
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
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  
  errorText: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.error,
    textAlign: 'center',
  },
  
  card: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  
  sectionHeader: {
    ...commonStyles.responsiveSectionHeader,
  },
  
  sectionTitle: {
    ...commonStyles.responsiveSectionTitle,
  },
  
  sectionContent: {
    marginTop: theme.spacing.sm,
  },
  
  infoRow: {
    ...commonStyles.responsiveInfoRow,
  },
  
  infoColumn: {
    flex: 1,
  },
  
  fullWidth: {
    flex: 2,
  },
  
  label: {
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: theme.responsiveTypography.fontSize.sm,
  },
  
  value: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.text,
  },
  
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
    fontSize: theme.responsiveTypography.fontSize.md,
  },

  // ---- Link to all offers ----
  allOffersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: 15,
    marginTop: 15,
  },
  allOffersText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: theme.responsiveTypography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // ---- Offer summary ----
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  metaText: {
    flex: 1,
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  // ---- Hotels ----
  hotelItemCard: {
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.backgroundWhite,
  },
  hotelDetailRow: {
    flexDirection: 'row',
    alignItems:  'flex-start',
    marginBottom: theme.spacing.sm,
  },
  hotelDetailText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.text,
    flex: 1,
  },
  hotelDetailLabel: {
    fontWeight: theme.typography.fontWeight.bold,
  },

  // ---- Agent contact ----
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  contactButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.responsiveTypography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  contactButtonContent: {
    flexDirection: 'column',
  },
    copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  copyButtonText: {
    color: theme.colors.primary,
    fontSize: theme.responsiveTypography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default ClientOfferDetailsScreen;
