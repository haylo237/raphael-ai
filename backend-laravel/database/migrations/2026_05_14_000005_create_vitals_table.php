<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('vitals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_profile_id')->constrained('patient_profiles')->cascadeOnDelete();
            $table->foreignId('recorded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('encounter_id')->nullable();
            $table->decimal('temperature_c', 4, 1)->nullable();
            $table->integer('heart_rate')->nullable();
            $table->integer('systolic_bp')->nullable();
            $table->integer('diastolic_bp')->nullable();
            $table->integer('respiratory_rate')->nullable();
            $table->integer('oxygen_saturation')->nullable();
            $table->decimal('weight_kg', 5, 1)->nullable();
            $table->decimal('height_cm', 5, 1)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('recorded_at')->nullable();
            $table->timestamps();
            $table->index(['patient_profile_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vitals');
    }
};
