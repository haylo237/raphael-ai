<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('hospitals', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city')->nullable();
            $table->string('region')->nullable();
            $table->string('country')->default('Cameroon');
            $table->string('phone')->nullable();
            $table->decimal('latitude', 10, 6)->nullable();
            $table->decimal('longitude', 10, 6)->nullable();
            $table->json('capabilities')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospitals');
    }
};
