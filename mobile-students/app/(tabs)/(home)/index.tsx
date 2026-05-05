import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';

export default function HomeScreen() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Redirect
      href={{
        pathname: '/(tabs)/(home)/student/[studentId]',
        params: {
          studentId: user.id.toString(),
          givenName: user.given_name,
          familyName: user.family_name,
        },
      }}
    />
  );
}
