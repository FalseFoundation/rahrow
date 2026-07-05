import { StyleSheet, Text, View } from 'react-native'

export default function HomeScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>RahRow Mobile</Text>
			<Text style={styles.subtitle}>Expo Router scaffold with shared UI tokens.</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
	},
	subtitle: {
		marginTop: 12,
		fontSize: 14,
		textAlign: 'center',
		opacity: 0.8,
	},
})
