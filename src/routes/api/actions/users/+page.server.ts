import {
	Collections,
	userDetailsFormSchema,
	userFormSchema,
	type UserDetails,
	type User
} from '@types';
import type { Actions } from './$types';
import { message, superValidate } from 'sveltekit-superforms/server';
import { fail } from '@sveltejs/kit';
import type { ClientResponseError } from 'pocketbase';
import { INVALID_CREDENTIALS, SOMETHING_WENT_WRONG } from '@utils';
import { db } from '@server';
import { zod } from 'sveltekit-superforms/adapters';

export const actions: Actions = {
	account: async ({ request, locals }) => {
		const form = await superValidate(request, zod(userFormSchema));
		if (!form.valid) return fail(400, { form });
		try {
			if (locals.user) {
				form.data.role = locals.user.role;
				await locals.DB.collection<User>(Collections.Users).update(locals.user.id, form.data);
			}
			return { form };
		} catch (error) {
			const err = error as ClientResponseError;
			return err.response.code !== 400
				? message(form, INVALID_CREDENTIALS)
				: message(form, err.message, {
						status: err.response.code
					});
		}
	},
	details: async ({ request, locals }) => {
		const form = await superValidate(request, zod(userDetailsFormSchema));

		if (!form.valid) return fail(400, { form });

		try {
			if (locals.user) {
				const { id } = locals.user;
				const details = await db
					.collection<UserDetails>(Collections.UsersDetails)
					.getFirstListItem(`user="${id}"`);
				await locals.DB.collection<UserDetails>(Collections.UsersDetails).update(details.id, {
					bio: form.data.bio || '',
					details: form.data.details || '',
					x: form.data.x || '',
					linkedin: form.data.linkedin || '',
					github: form.data.github || '',
					user: id,
					updated: new Date()
				});
			}
			return { form };
		} catch (error) {
			const err = error as ClientResponseError;
			return err.response.code !== 400
				? message(form, INVALID_CREDENTIALS)
				: message(form, err.message, {
						status: err.response.code
					});
		}
	},
	avatar: async ({ request, locals }) => {
		const formData = await request.formData();
		const avatar = formData.get('avatar');
		if (avatar instanceof File && locals.user) {
			const id = locals.user.id;
			const { id: userId } = await db.collection<User>(Collections.Users).update(id, {
				avatar
			});
			if (userId) return { success: true };
		} else {
			return fail(400, {
				message: SOMETHING_WENT_WRONG
			});
		}
	},
	removeAvatar: async ({ locals }) => {
		if (locals.user) {
			const id = locals.user.id;
			const { id: userId } = await db.collection<User>(Collections.Users).update(id, {
				avatar: null
			});
			if (userId) return { success: true };
		} else {
			return fail(400, {
				message: SOMETHING_WENT_WRONG
			});
		}
	}
};
