def testCreateAndFetchUsers(objClient):
    # This test covers the current login-user flow: create a user row, validate credentials, then read user data.
    objCreateResponse = objClient.post(
        "/api/v1/users",
        json={
            "UserID": "admin",
            "PasswordHash": "$2b$12$/tWtyuECbYDaMXFT/Qo9eOCEuUe8Wg5W8tHCtXJWv96wbMlwC9Mdi",
        },
    )
    assert objCreateResponse.status_code == 201
    assert objCreateResponse.json()["success"] is True

    objValidateResponse = objClient.post(
        "/api/v1/users/validateUser",
        json={
            "UserID": "admin",
            "Password": "$2b$12$/tWtyuECbYDaMXFT/Qo9eOCEuUe8Wg5W8tHCtXJWv96wbMlwC9Mdi",
        },
    )
    assert objValidateResponse.status_code == 200
    assert objValidateResponse.json()["message"] == "Authentication successful"
    assert objValidateResponse.json()["data"]["intUserID"] == 1

    objListResponse = objClient.get("/api/v1/users")
    assert objListResponse.status_code == 200
    assert len(objListResponse.json()["data"]["lstUsers"]) == 1

    objDetailResponse = objClient.get("/api/v1/users/1")
    assert objDetailResponse.status_code == 200
    assert objDetailResponse.json()["data"]["objUser"]["UserID"] == "admin"


