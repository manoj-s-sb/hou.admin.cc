// Note: Dashboard and Maintenance are intentionally NOT re-exported here.
// They are code-split via React.lazy() in App.tsx — adding them back would defeat the chunking.
import CentreManagement from './centres';
import CoachSchedule from './coach/index';
import Induction from './induction';
import ViewInduction from './induction/viewInduction';
import Login from './login';
import Members from './members';
import ViewMembers from './members/viewMembers';
import MembershipPlans from './membership';
import SlotBookings from './slots';
import StaffManagement from './staff';
import AddStaffMember from './staff/AddStaffMember';
import ViewStaffMember from './staff/ViewStaffMember';
import Tailgate from './tailgate';
import Tours from './tours';
import UserList from './users';

export {
  Induction,
  Login,
  UserList,
  ViewInduction,
  Tours,
  Members,
  ViewMembers,
  SlotBookings,
  CoachSchedule,
  Tailgate,
  StaffManagement,
  AddStaffMember,
  ViewStaffMember,
  CentreManagement,
  MembershipPlans,
};
