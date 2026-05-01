<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id'      => ['required', 'string', 'min:1'],
            'symptoms'        => ['required', 'array', 'min:1'],
            'symptoms.*'      => ['required', 'string'],
            'urgency'         => ['sometimes', 'string', 'in:normal,emergency'],
            'network_quality' => ['sometimes', 'string', 'in:good,fair,poor,offline'],
            'device_reachable'=> ['sometimes', 'boolean'],
            'location'        => ['sometimes', 'string'],
            'otp_code'        => ['sometimes', 'string', 'min:4', 'max:12'],
            'verification_radius_meters' => ['sometimes', 'numeric', 'min:10', 'max:10000'],
        ];
    }
}
