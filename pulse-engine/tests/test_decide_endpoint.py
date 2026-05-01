import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


class DecideEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    @patch("app.main.location.get_location")
    @patch("app.main.qod.request_priority")
    @patch("app.main.congestion.get_insights")
    @patch("app.main.identity.check_sim_swap")
    @patch("app.main.identity.verify_number")
    @patch("app.main.device.get_roaming_status")
    @patch("app.main.device.get_reachability")
    def test_low_path(
        self,
        mock_get_reachability,
        mock_get_roaming_status,
        mock_verify_number,
        mock_check_sim_swap,
        mock_get_insights,
        mock_request_priority,
        mock_get_location,
    ) -> None:
        mock_get_reachability.return_value = {"reachable": True, "connectivity": ["DATA"]}
        mock_get_roaming_status.return_value = {"roaming": False}
        mock_verify_number.return_value = {"verified": True}
        mock_check_sim_swap.return_value = {"swapped": False}
        mock_get_insights.return_value = {"congestion_level": "LOW", "congestion_score": 0.1}

        payload = {
            "patient_id": "+12345678901",
            "urgency": "LOW",
            "network_quality": "GOOD",
            "device_reachable": True,
            "location": "Accra",
        }
        response = self.client.post("/decide", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["is_emergency"])
        self.assertEqual(body["decision"]["mode"], "CHAT")
        self.assertEqual(body["decision"]["priority"], "NORMAL")
        self.assertIn("Use CHAT communication", body["decision"]["actions"])
        self.assertFalse(body["request_qod"])
        mock_request_priority.assert_not_called()
        mock_get_location.assert_not_called()

    @patch("app.main.location.get_location")
    @patch("app.main.qod.request_priority")
    @patch("app.main.congestion.get_insights")
    @patch("app.main.identity.check_sim_swap")
    @patch("app.main.identity.verify_number")
    @patch("app.main.device.get_roaming_status")
    @patch("app.main.device.get_reachability")
    def test_medium_path(
        self,
        mock_get_reachability,
        mock_get_roaming_status,
        mock_verify_number,
        mock_check_sim_swap,
        mock_get_insights,
        mock_request_priority,
        mock_get_location,
    ) -> None:
        mock_get_reachability.return_value = {"reachable": True, "connectivity": ["DATA"]}
        mock_get_roaming_status.return_value = {"roaming": False}
        mock_verify_number.return_value = {"verified": True}
        mock_check_sim_swap.return_value = {"swapped": False}
        mock_get_insights.return_value = {"congestion_level": "MODERATE", "congestion_score": 0.5}

        payload = {
            "patient_id": "+12345678901",
            "urgency": "MEDIUM",
            "network_quality": "MODERATE",
            "device_reachable": True,
            "location": "Lagos",
        }
        response = self.client.post("/decide", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["is_emergency"])
        self.assertEqual(body["decision"]["mode"], "AUDIO")
        self.assertEqual(body["decision"]["priority"], "NORMAL")
        self.assertIn("Use AUDIO communication", body["decision"]["actions"])
        self.assertFalse(body["request_qod"])
        mock_request_priority.assert_not_called()
        mock_get_location.assert_not_called()

    @patch("app.main.location.get_location")
    @patch("app.main.qod.request_priority")
    @patch("app.main.congestion.get_insights")
    @patch("app.main.identity.check_sim_swap")
    @patch("app.main.identity.verify_number")
    @patch("app.main.device.get_roaming_status")
    @patch("app.main.device.get_reachability")
    def test_high_path(
        self,
        mock_get_reachability,
        mock_get_roaming_status,
        mock_verify_number,
        mock_check_sim_swap,
        mock_get_insights,
        mock_request_priority,
        mock_get_location,
    ) -> None:
        mock_get_reachability.return_value = {"reachable": True, "connectivity": ["DATA"]}
        mock_get_roaming_status.return_value = {"roaming": False}
        mock_verify_number.return_value = {"verified": True}
        mock_check_sim_swap.return_value = {"swapped": False}
        mock_get_insights.return_value = {"congestion_level": "LOW", "congestion_score": 0.2}

        payload = {
            "patient_id": "+12345678901",
            "urgency": "HIGH",
            "network_quality": "GOOD",
            "device_reachable": True,
            "location": "Nairobi",
        }
        response = self.client.post("/decide", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["is_emergency"])
        self.assertEqual(body["decision"]["mode"], "VIDEO")
        self.assertEqual(body["decision"]["priority"], "NORMAL")
        self.assertIn("Use VIDEO communication", body["decision"]["actions"])
        self.assertFalse(body["request_qod"])
        mock_request_priority.assert_not_called()
        mock_get_location.assert_not_called()

    @patch("app.main.location.get_location")
    @patch("app.main.qod.request_priority")
    @patch("app.main.congestion.get_insights")
    @patch("app.main.identity.check_sim_swap")
    @patch("app.main.identity.verify_number")
    @patch("app.main.device.get_roaming_status")
    @patch("app.main.device.get_reachability")
    def test_emergency_path(
        self,
        mock_get_reachability,
        mock_get_roaming_status,
        mock_verify_number,
        mock_check_sim_swap,
        mock_get_insights,
        mock_request_priority,
        mock_get_location,
    ) -> None:
        mock_get_reachability.return_value = {"reachable": True, "connectivity": ["DATA", "SMS"]}
        mock_get_roaming_status.return_value = {"roaming": False}
        mock_verify_number.return_value = {"verified": True}
        mock_check_sim_swap.return_value = {"swapped": False}
        mock_get_insights.return_value = {"congestion_level": "HIGH", "congestion_score": 0.8}
        mock_request_priority.return_value = {"sessionId": "qod-123", "status": "REQUESTED"}
        mock_get_location.return_value = {
            "lastLocationTime": "2026-05-01T00:00:00Z",
            "area": {
                "areaType": "CIRCLE",
                "center": {"latitude": 3.848, "longitude": 11.502},
                "radius": 100,
            },
        }

        payload = {
            "patient_id": "+12345678901",
            "urgency": "EMERGENCY",
            "network_quality": "POOR",
            "device_reachable": True,
            "location": "Yaounde",
        }
        response = self.client.post("/decide", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["is_emergency"])
        self.assertEqual(body["decision"]["mode"], "PRIORITY")
        self.assertEqual(body["decision"]["priority"], "HIGH")
        self.assertTrue(body["request_qod"])
        self.assertIn("assigned_hospital", body)
        self.assertIn("patient_location", body)
        self.assertIn("Request QoD (priority network)", body["decision"]["actions"])
        self.assertIn("Initiate emergency communication", body["decision"]["actions"])
        mock_request_priority.assert_called_once()
        mock_get_location.assert_called_once()


if __name__ == "__main__":
    unittest.main()
