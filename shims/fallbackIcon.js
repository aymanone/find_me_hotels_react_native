// shims/fallbackIcon.js
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const FallbackIcon = (props) => {
  if (__DEV__) console.warn('Stubbed icon used:', props.name);
  return <FontAwesome5 {...props} name="question-circle" />;
};
FallbackIcon.glyphMap = {};
FallbackIcon.font = {};
FallbackIcon.getImageSource = async () => null;
export default FallbackIcon;
