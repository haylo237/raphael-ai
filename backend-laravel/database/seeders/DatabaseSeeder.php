<?php

namespace Database\Seeders;

use App\Models\Hospital;
use App\Models\PatientProfile;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Super admin
        User::firstOrCreate(
            ['phone' => '+237600000001'],
            [
                'name' => 'Raphael Super Admin',
                'email' => 'admin@raphael.ai',
                'password' => 'admin1234',
                'role' => 'super_admin',
            ]
        );

        // Hospitals
        $hospitals = [
            ['name' => 'Yaoundé Central Hospital', 'city' => 'Yaoundé', 'latitude' => 3.8662, 'longitude' => 11.5174],
            ['name' => 'Douala General Hospital', 'city' => 'Douala', 'latitude' => 4.0511, 'longitude' => 9.7679],
            ['name' => 'Bamenda Regional Hospital', 'city' => 'Bamenda', 'latitude' => 5.9597, 'longitude' => 10.1463],
        ];
        $hospitalIds = [];
        foreach ($hospitals as $h) {
            $hospital = Hospital::firstOrCreate(['name' => $h['name']], $h + ['country' => 'Cameroon']);
            $hospitalIds[] = $hospital->id;
        }

        // Emergency coordinator
        User::firstOrCreate(
            ['phone' => '+237600000002'],
            [
                'name' => 'Marie Emergency Coord',
                'email' => 'coordinator@raphael.ai',
                'password' => 'demo1234',
                'role' => 'emergency_coordinator',
            ]
        );

        $staffSpecs = [
            // hospital_idx, role, name, phone, code, specialty
            [0, 'hospital_admin',  'Dr. Jean Mbala',  '+237600100001', 'ADM-001', 'Administration'],
            [0, 'doctor',          'Dr. Aline Nkomo', '+237600100002', 'DOC-001', 'Cardiology'],
            [0, 'doctor',          'Dr. Paul Eteki',  '+237600100003', 'DOC-002', 'General Medicine'],
            [0, 'nurse',           'Grace Tabi',      '+237600100004', 'NRS-001', 'Triage'],
            [0, 'receptionist',    'Sandra Mvogo',    '+237600100005', 'REC-001', 'Front Desk'],
            [1, 'doctor',          'Dr. Samuel Bekolo','+237600100006','DOC-003', 'Trauma'],
            [1, 'nurse',           'Esther Manga',    '+237600100007', 'NRS-002', 'ICU'],
            [2, 'doctor',          'Dr. Linda Achu',  '+237600100008', 'DOC-004', 'Pediatrics'],
            [2, 'health_worker',   'Patrick Ngu',     '+237600100009', 'HW-001',  'Community Health'],
        ];

        foreach ($staffSpecs as [$idx, $role, $name, $phone, $code, $specialty]) {
            $user = User::firstOrCreate(
                ['phone' => $phone],
                [
                    'name' => $name,
                    'password' => 'demo1234',
                    'role' => $role,
                    'hospital_id' => $hospitalIds[$idx],
                ]
            );
            StaffProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'hospital_id' => $hospitalIds[$idx],
                    'staff_code' => $code,
                    'specialty' => $specialty,
                ]
            );
        }

        // Demo patients
        $patients = [
            ['Jean', 'Kamga',   '+237677000001', 'male',   'A+'],
            ['Awa',  'Bello',   '+237677000002', 'female', 'O-'],
            ['Eric', 'Ngassa',  '+237677000003', 'male',   'B+'],
        ];
        foreach ($patients as $i => [$first, $last, $phone, $gender, $bg]) {
            $user = User::firstOrCreate(
                ['phone' => $phone],
                [
                    'name' => "$first $last",
                    'password' => 'patient1234',
                    'role' => 'patient',
                ]
            );
            PatientProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'code' => 'RAP-' . str_pad((string) ($i + 1), 6, '0', STR_PAD_LEFT),
                    'first_name' => $first,
                    'last_name' => $last,
                    'phone' => $phone,
                    'gender' => $gender,
                    'blood_group' => $bg,
                ]
            );
        }
    }
}
