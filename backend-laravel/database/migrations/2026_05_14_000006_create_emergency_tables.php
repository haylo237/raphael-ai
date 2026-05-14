<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('emergency_cases', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // EMG-00001
            $table->foreignId('patient_id')->nullable()->constrained('patient_profiles')->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_hospital_id')->nullable()->constrained('hospitals')->nullOnDelete();
            $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('patient_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('emergency_type')->nullable(); // Cardiac, Trauma, Respiratory, Stroke, Other
            $table->enum('priority', ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'])->default('HIGH');
            $table->enum('status', [
                'submitted',
                'processing',
                'assigned',
                'accepted',
                'in_progress',
                'resolved',
                'cancelled',
            ])->default('submitted');

            $table->text('symptoms')->nullable();
            $table->string('location_hint')->nullable();
            $table->decimal('latitude', 10, 6)->nullable();
            $table->decimal('longitude', 10, 6)->nullable();
            $table->string('network_quality')->nullable();
            $table->boolean('device_reachable')->default(true);

            $table->json('pulse_response_json')->nullable();
            $table->json('decision_json')->nullable();
            $table->json('timeline_json')->nullable();
            $table->json('explanation_json')->nullable();

            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'priority']);
        });

        Schema::create('emergency_case_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('emergency_case_id')->constrained('emergency_cases')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event'); // CASE_CREATED, QOD_REQUESTED, HOSPITAL_ASSIGNED, ACCEPTED, RESOLVED, ESCALATED, NOTE
            $table->text('detail')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['emergency_case_id', 'occurred_at']);
        });

        Schema::create('pulse_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('emergency_case_id')->constrained('emergency_cases')->cascadeOnDelete();
            $table->string('endpoint');
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->integer('latency_ms')->nullable();
            $table->boolean('success')->default(true);
            $table->timestamps();
        });

        Schema::create('pulse_network_contexts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('emergency_case_id')->constrained('emergency_cases')->cascadeOnDelete();
            $table->boolean('reachable')->nullable();
            $table->string('network_quality')->nullable();
            $table->boolean('roaming')->nullable();
            $table->boolean('identity_verified')->nullable();
            $table->boolean('sim_swap_detected')->nullable();
            $table->boolean('qod_requested')->nullable();
            $table->string('qod_status')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pulse_network_contexts');
        Schema::dropIfExists('pulse_logs');
        Schema::dropIfExists('emergency_case_events');
        Schema::dropIfExists('emergency_cases');
    }
};
