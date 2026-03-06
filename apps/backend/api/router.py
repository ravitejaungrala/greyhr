from fastapi import APIRouter
from .auth_routes import router as auth_router
from .admin_routes import router as admin_router
from .employee_routes import router as employee_router
from .utils import get_attendance_calendar # Explicitly included for legacy reasons if needed

router = APIRouter()

# Aggregating all sub-routers
router.include_router(auth_router)
router.include_router(admin_router)
router.include_router(employee_router)

# Note: get_attendance_calendar is now in utils.py and accessible via employee_router
# if it was exposed as an endpoint. In original router.py it was /employee/attendance/calendar.
# I'll ensure it's in employee_routes.py.
