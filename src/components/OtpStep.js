import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import { showAlert } from './ShowAlert';
import { theme } from '../styles/theme';
import { useTranslation } from '../config/localization';

// Wait before each new code can be requested:
// 1st code -> wait 60s -> 2nd code -> wait 120s -> 3rd code -> wait 1 hour -> 4th code (and any after) -> 1 hour
export const RESEND_DELAYS = [60, 120, 3600];
export const MAX_WRONG_ATTEMPTS = 5;
const CODE_LENGTH = 6;

// sendCount = how many codes have been sent so far (1 after signup)
export const getResendDelay = (sendCount) =>
  RESEND_DELAYS[Math.min(Math.max(sendCount, 1), RESEND_DELAYS.length) - 1];

const pad = (n) => String(n).padStart(2, '0');
const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

/**
 * Props:
 *  phone          full E.164 number the code was sent to
 *  sendCount      number of codes sent so far
 *  nextSendAt     timestamp (ms) when the next code may be requested
 *  onResent       ({ sendCount, nextSendAt }) => void   called after a successful resend
 *  onVerified     () => void                            called after the code is accepted
 *  onChangeNumber () => void                            go back to the form
 */
export default function OtpStep({ phone, sendCount, nextSendAt, onResent, onVerified, onChangeNumber, onBeforeVerify, onVerifyError }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((nextSendAt - now) / 1000));
  const tooManyAttempts = attempts >= MAX_WRONG_ATTEMPTS;
  const canVerify = code.length === CODE_LENGTH && !verifying && !resending && !tooManyAttempts;
  const canResend = secondsLeft === 0 && !resending && !verifying;

  const handleVerify = async () => {
  if (!canVerify) return;
  try {
    setVerifying(true);
    // Turn the "resetting password" flag on BEFORE the session is created,
    // so the navigator doesn't switch to the app stack too early
    onBeforeVerify?.();
    // Type is 'sms' even when the code arrives on WhatsApp
    const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    if (error) {
      onVerifyError?.(); // turn the flag back off
      if (error.status === 429) {
        throw new Error(t('OtpStep', 'tooManyRequests'));
      }
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setCode('');
       const left = MAX_WRONG_ATTEMPTS - newAttempts;
      throw new Error(
          left > 0
          ? `${t('OtpStep', 'invalidCode')} (${left} ${t('OtpStep', 'attemptsLeft')})`
          : t('OtpStep', 'tooManyWrongCodes')
        );
    }
    onVerified();
  } catch (error) {
    showAlert(t('Alerts', 'error'), error.message || t('OtpStep', 'sendFailed'));
  } finally {
    setVerifying(false);
  }
};

  const handleResend = async () => {
    if (!canResend) return;
    try {
      setResending(true);
      // auth.resend() has no WhatsApp channel option, so request a new code with signInWithOtp
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: 'whatsapp', shouldCreateUser: false },
      });
      if (error) {
        if (error.status === 429) {
          throw new Error(t('OtpStep', 'tooManyRequests'));
        }
        throw error;
      }
      const nextCount = sendCount + 1;
      onResent({
        sendCount: nextCount,
        nextSendAt: Date.now() + getResendDelay(nextCount) * 1000,
      });
      setAttempts(0);
      setCode('');
      showAlert(t('OtpStep', 'codeResent'));
    } catch (error) {
      showAlert(t('Alerts', 'error'), error.message || t('OtpStep', 'sendFailed'));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text h4 style={styles.title}>{t('OtpStep', 'title')}</Text>
      <Text style={styles.subtitle}>
        {t('OtpStep', 'codeSentTo')} {'\u2066' + phone + '\u2069'}
      </Text>

      <Input
        placeholder="123456"
        value={code}
        onChangeText={text => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        editable={!tooManyAttempts}
        errorMessage={tooManyAttempts ? t('OtpStep', 'tooManyWrongCodes') : ''}
      />

      <Button
        title={t('OtpStep', 'verify')}
        onPress={handleVerify}
        loading={verifying}
        disabled={!canVerify}
        disabledStyle={styles.disabledButton}
        disabledTitleStyle={styles.disabledTitle}
      />

      <Button
        type="clear"
        title={canResend ? t('OtpStep', 'resendCode') : `${t('OtpStep', 'resendIn')} ${formatTime(secondsLeft)}`}
        onPress={handleResend}
        loading={resending}
        disabled={!canResend}
        disabledStyle={styles.disabledButton}
        disabledTitleStyle={styles.disabledTitle}
        containerStyle={styles.link}
      />

      <Button
        type="clear"
        title={t('OtpStep', 'changeNumber')}
        onPress={onChangeNumber}
        disabled={verifying || resending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: theme.spacing.sm,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  link: {
    marginTop: theme.spacing.xs,
  },
  disabledButton: {
   backgroundColor: theme.colors.disabled ?? '#D1D5D8', opacity: 0.6 
   },
disabledTitle: { color: '#fff' },
});
