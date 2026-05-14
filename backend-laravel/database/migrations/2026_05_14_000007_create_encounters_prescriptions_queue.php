<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('encounters', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // CON-00001
            $table->foreignId('patient_id')->constrained('patient_profiles')->cascadeOnDelete();
            $table->foreignId('hospital_id')->nullable()->constrained('hospitals')->nullOnDelete();
            $table->foreignId('doctor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('emergency_case_id')->nullable()->constrained('emergency_cases')->nullOnDelete();
            $table->enum('status', ['pending', 'in_progress', 'resolved'])->default('pending');
            $table->text('chief_complaint')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('encounter_id')->constrained('encounters')->cascadeOnDelete();
            $table->foreignId('prescribed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('medication');
            $table->string('dosage')->nullable();
            $table->string('frequency')->nullable();
            $table->string('duration')->nullable();
            $table->text('instructions')->nullable();
            $table->timestamps();
        });

        // Walk-in queue (receptionist)
        Schema::create('queue_entries', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('patient_id')->constrained('patient_profiles')->cascadeOnDelete();
            $table->foreignId('hospital_id')->nullable()->constrained('hospitals')->nullOnDelete();
            $table->foreignId('assigned_doctor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason')->nullable();
            $table->enum('priority', ['normal', 'urgent', 'emergency'])->default('normal');
            $table->enum('status', ['waiting', 'assigned', 'in_progress', 'done'])->default('waiting');
            $table->timestamps();
            $table->index(['status', 'priority']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_entries');
        Schema::dropIfExists('prescriptions');
        Schema::dropIfExists('encounters');
    }
};
