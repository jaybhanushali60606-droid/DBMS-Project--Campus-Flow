from datetime import timedelta
from email.message import EmailMessage
import smtplib
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.faculty import Faculty
from app.schemas.auth import Token, LoginRequest, UserOut, PasswordChange, PasswordResetRequest, PasswordResetConfirm, ProfileUpdate
from app.utils.security import verify_password, create_access_token, get_password_hash
from app.api.deps import get_current_user
from app.config import settings
from app.models.profile_details import FacultyContactProfile, StudentContactProfile

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _ensure_email_configured() -> None:
    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        raise HTTPException(status_code=503, detail="Campus email delivery is not configured. Contact your campus administrator.")

def _send_email(email: str, subject: str, body: str) -> None:
    _ensure_email_configured()
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = email
    message.set_content(body)
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise HTTPException(status_code=503, detail="Unable to send email right now. Please try again later.") from exc

def _send_reset_email(email: str, token: str) -> None:
    reset_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/login?{urlencode({'token': token})}"
    _send_email(
        email,
        "CampusFlow password reset",
        f"Use this link to reset your CampusFlow password. It expires in 15 minutes.\n\n{reset_url}\n\nIf you did not request this, ignore this email.",
    )

@router.post("/password-reset/request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    _ensure_email_configured()
    email = str(payload.email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email, User.is_active.is_(True)).first()
    # Do not disclose whether an email has an account.
    if user:
        token = create_access_token(
            {"sub": user.email, "purpose": "password_reset"},
            expires_delta=timedelta(minutes=15),
        )
        try:
            _send_reset_email(user.email, token)
        except HTTPException:
            # Keep the public response from revealing whether this email has an account.
            pass
    return {"message": "If an active account exists for that email, a reset link has been sent."}

@router.post("/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    try:
        claims = jwt.decode(payload.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        claims = {}
    if claims.get("purpose") != "password_reset" or not claims.get("sub"):
        raise HTTPException(status_code=400, detail="This password reset link is invalid or expired.")
    user = db.query(User).filter(func.lower(User.email) == claims["sub"].lower(), User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=400, detail="This password reset link is invalid or expired.")
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully. You can now sign in."}

@router.post("/login", response_model=Token)
def login(login_req: LoginRequest, db: Session = Depends(get_db)):
    # Support login with either username or email
    user = db.query(User).filter(
        (User.username == login_req.username) | (User.email == login_req.username)
    ).first()

    if not user or not verify_password(login_req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if login_req.role and user.role != login_req.role.upper():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    # Determine display name
    full_name = user.username
    if user.role == "FACULTY" and user.faculty_id:
        fac = db.query(Faculty).filter(Faculty.faculty_id == user.faculty_id).first()
        if fac:
            full_name = fac.full_name
    elif user.role == "STUDENT" and user.student_id:
        stu = db.query(Student).filter(Student.student_id == user.student_id).first()
        if stu:
            full_name = stu.full_name

    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.user_id, "role": user.role}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        role=user.role,
        faculty_id=user.faculty_id,
        student_id=user.student_id,
        full_name=full_name
    )

@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "faculty_id": current_user.faculty_id,
        "student_id": current_user.student_id,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
    }

    if current_user.role == "FACULTY" and current_user.faculty_id:
        fac = db.query(Faculty).filter(Faculty.faculty_id == current_user.faculty_id).first()
        if fac:
            profile["faculty_details"] = {
                "name": fac.full_name,
                "designation": fac.designation,
                "department": fac.department.dept_name if fac.department else None,
                "dept_id": fac.dept_id,
                "profile": {
                    "phone": fac.contact_profile.phone if fac.contact_profile else None,
                    "personal_email": fac.contact_profile.personal_email if fac.contact_profile else None,
                    "gender": fac.contact_profile.gender if fac.contact_profile else None,
                    "date_of_birth": fac.contact_profile.date_of_birth if fac.contact_profile else None,
                    "address": fac.contact_profile.address if fac.contact_profile else None,
                    "highest_qualification": fac.contact_profile.highest_qualification if fac.contact_profile else None,
                    "years_experience": fac.contact_profile.years_experience if fac.contact_profile else None,
                    "joining_date": fac.contact_profile.joining_date if fac.contact_profile else None,
                    "emergency_contact_name": fac.contact_profile.emergency_contact_name if fac.contact_profile else None,
                    "emergency_contact_phone": fac.contact_profile.emergency_contact_phone if fac.contact_profile else None,
                },
            }
    elif current_user.role == "STUDENT" and current_user.student_id:
        stu = db.query(Student).filter(Student.student_id == current_user.student_id).first()
        if stu:
            division = stu.division_assignment.division if stu.division_assignment else None
            profile["student_details"] = {
                "name": stu.full_name,
                "roll_no": stu.roll_no,
                "dob": str(stu.dob),
                "department": stu.department.dept_name if stu.department else None,
                "dept_id": stu.dept_id,
                "academic_year": division.academic_year if division else None,
                "branch": division.branch if division else None,
                "division_name": division.division_name if division else None,
                "profile": {
                    "phone": stu.contact_profile.phone if stu.contact_profile else None,
                    "personal_email": stu.contact_profile.personal_email if stu.contact_profile else None,
                    "gender": stu.contact_profile.gender if stu.contact_profile else None,
                    "address": stu.contact_profile.address if stu.contact_profile else None,
                    "guardian_name": stu.contact_profile.guardian_name if stu.contact_profile else None,
                    "guardian_phone": stu.contact_profile.guardian_phone if stu.contact_profile else None,
                    "blood_group": stu.contact_profile.blood_group if stu.contact_profile else None,
                },
            }

    return profile


@router.patch("/profile")
def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    provided_fields = payload.model_fields_set
    if current_user.role == "FACULTY" and current_user.faculty_id:
        allowed_fields = {
            "phone", "personal_email", "gender", "address", "date_of_birth",
            "highest_qualification", "years_experience", "joining_date",
            "emergency_contact_name", "emergency_contact_phone",
        }
        if provided_fields - allowed_fields:
            raise HTTPException(status_code=400, detail="These fields are only available in a student profile.")
        profile = db.query(FacultyContactProfile).filter(FacultyContactProfile.faculty_id == current_user.faculty_id).first()
        if not profile:
            profile = FacultyContactProfile(faculty_id=current_user.faculty_id)
            db.add(profile)
    elif current_user.role == "STUDENT" and current_user.student_id:
        allowed_fields = {"phone", "personal_email", "gender", "address", "guardian_name", "guardian_phone", "blood_group"}
        if provided_fields - allowed_fields:
            raise HTTPException(status_code=400, detail="These fields are only available in a faculty profile.")
        profile = db.query(StudentContactProfile).filter(StudentContactProfile.student_id == current_user.student_id).first()
        if not profile:
            profile = StudentContactProfile(student_id=current_user.student_id)
            db.add(profile)
    else:
        raise HTTPException(status_code=403, detail="A personal profile is only available to linked student and faculty accounts.")

    for field in provided_fields:
        value = getattr(payload, field)
        setattr(profile, field, str(value) if field == "personal_email" and value is not None else value)
    db.commit()
    return get_current_user_profile(current_user=current_user, db=db)

@router.post("/change-password")
def change_password(
    pw_change: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(pw_change.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match."
        )
    current_user.hashed_password = get_password_hash(pw_change.new_password)
    db.commit()
    return {"message": "Password changed successfully."}
