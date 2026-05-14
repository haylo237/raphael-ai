<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('patient_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // RAP-000001
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('registered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->date('date_of_birth')->nullable();
            $table->integer('age')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('phone')->nullable();
            $table->string('blood_group', 8)->nullable();
            $table->text('address')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->json('allergies')->nullable();
            $table->json('conditions')->nullable();
            $table->json('medications')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['first_name', 'last_name']);
            $table->index('phone');
        });

        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('hospital_id')->nullable()->constrained('hospitals')->nullOnDelete();
            $table->string('staff_code')->unique(); // DOC-001 / NRS-001 ...
            $table->string('specialty')->nullable();
            $table->string('department')->nullable();
            $table->string('license_number')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_profiles');
        Schema::dropIfExists('patient_profiles');
    }
};
