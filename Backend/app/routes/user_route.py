from fastapi import APIRouter, Depends, HTTPException, status

from ...database.db_client import Supabase, get_db
from ..models import UserCreate, UserUpdate, UserResponse

router = APIRouter()


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user profile",
    tags=["users"],
)
async def create_user(user: UserCreate, db: Supabase = Depends(get_db)):
    try:
        data = user.dict()
        result = db.create_user(data)

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user",
            )

        return result.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Fetch user profile",
    tags=["users"],
)
async def get_user(user_id: str, db: Supabase = Depends(get_db)):
    try:
        result = db.get_user(user_id)

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user profile",
    tags=["users"],
)
async def update_user(
    user_id: str, user: UserUpdate, db: Supabase = Depends(get_db)
):
    try:
        # Check if user exists
        existing = db.get_user(user_id)
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Only update fields that were provided
        data = user.dict(exclude_unset=True)

        if not data:
            # If no fields to update, return existing user
            return existing.data[0]

        result = db.update_user(user_id, data)

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user",
            )

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user profile",
    tags=["users"],
)
async def delete_user(user_id: str, db: Supabase = Depends(get_db)):
    try:
        # Check if user exists
        existing = db.get_user(user_id)
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        db.delete_user(user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )
