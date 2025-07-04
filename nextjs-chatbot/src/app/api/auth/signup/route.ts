import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { first_name, last_name, email, password } = body;

        // Validate input
        if (!email || !password || !first_name || !last_name) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Make a request to the Django backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: email,
                email,
                password,
                first_name,
                last_name,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Forward the error from the backend
            return NextResponse.json(
                { message: data.detail || data.message || 'Registration failed' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            message: 'User registered successfully',
            user: {
                email,
                first_name,
                last_name,
            },
        });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
