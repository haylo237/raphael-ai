<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! in_array($user->role, $roles, true) && $user->role !== 'super_admin') {
            return response()->json([
                'message' => 'Forbidden. Required role: ' . implode('|', $roles),
                'your_role' => $user->role,
            ], 403);
        }

        return $next($request);
    }
}
