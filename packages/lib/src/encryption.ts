import * as argon2 from 'argon2'

export async function hash(string: string): Promise<string> {
	return argon2.hash(string, {
		type: argon2.argon2id,
		memoryCost: 2 ** 16,
		timeCost: 3,
		parallelism: 1,
	})
}

export async function validate(string: string, hash: string): Promise<boolean> {
	return argon2.verify(hash, string)
}
