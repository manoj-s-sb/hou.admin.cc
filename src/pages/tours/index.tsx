import SectionTitle from "../../components/SectionTitle";
import UserTable from "../../components/UserTable";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { useEffect, useState } from "react";
import { inductionList } from "../../store/induction/api";
import { getTodayDateInChicago } from "../../utils/dateUtils";

const Tours = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { inductionList: inductionListData, isLoading } = useSelector(
    (state: RootState) => state.induction,
  );

  const [selectedDate, setSelectedDate] = useState(getTodayDateInChicago());

  console.log(inductionListData);
  console.log(isLoading);

  useEffect(() => {
    dispatch(
      inductionList({
        date: selectedDate,
        page: 1,
        type: "tourbooking",
        listLimit: 20,
      }),
    );
  }, [dispatch, selectedDate]);

  return (
    <div className="w-full max-w-full">
      <SectionTitle
        title="Tour Details"
        description="Manage your tour details."
        inputPlaceholder="Search tour..."
        value=""
        onSearch={() => {}}
      />

      {/* Date Filter */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <label
          htmlFor="induction-date"
          className="text-sm font-medium text-gray-700 whitespace-nowrap"
        >
          Select Date:
        </label>
        <input
          id="induction-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="overflow-x-auto">
        <UserTable
          data={[]}
          columns={[]}
          selectedItem={null}
          onSelectItem={() => {}}
        />
      </div>
    </div>
  );
};

export default Tours;
