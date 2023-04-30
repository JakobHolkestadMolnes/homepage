import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import type { CourseList } from '$lib/types/interfaces';
import { env } from '$env/dynamic/private';

const institution = '194';
const semester = '23v';

/** @type {import('./$types').PageLoad} */
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.auth.validateUser();
	if (!user) throw redirect(302, '/login');
	const courses = await client.course.findMany({
		where: {
			user_id: user.userId
		}
	});
	user.courses = courses;

	const availableCourses = await fetchAvailableCourses();

	return {
		user: user,
		availableCourses: availableCourses
	};
};

export const actions = {
	addCourse: async ({ locals, request }) => {
		const { user } = await locals.auth.validateUser();
		if (!user) throw redirect(302, '/login');

		const courseId = (await request.formData()).get('courseId')?.toString();
		if (!courseId) throw redirect(302, '/profile');

		const course = await client.course.create({
			data: {
				id: courseId,
				user_id: user.userId
			}
		});
		return {
			body: course
		};
	},

	removeCourse: async ({ locals, request }) => {
		const { user } = await locals.auth.validateUser();
		if (!user) throw redirect(302, '/login');

		const courseId = (await request.formData()).get('courseId')?.toString();
		if (!courseId) throw redirect(302, '/profile');

		const course = await client.course.delete({
			where: {
				id: courseId
			}
		});
		return {
			body: course
		};
	},

	logout: async ({ locals }) => {
		await locals.auth.setSession(null);
		throw redirect(302, '/login');
	}
};

async function fetchAvailableCourses() {
	const response = await fetch(`${env.TP_URL}/ws/course/?id=${institution}&sem=${semester}`, {
		method: 'GET',
		headers: {
			'content-type': 'application/json',
			'X-Gravitee-Api-Key': env.TP_TOKEN
		}
	});
	const data: CourseList = await response.json();
	return data;
}
